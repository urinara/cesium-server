'use strict';

import express from 'express';
import https from 'https';
import fs from 'fs';
import { generators, Issuer, Strategy } from 'openid-client';
import passport from 'passport';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import memorystore from 'memorystore';
import 'dotenv/config'
import { fstat } from 'fs';


const MemoryStore = memorystore(session);
const sessionStore = new MemoryStore({ checkPeriod: 8640000 });


export async function handleLogin() {

    const hostUri = process.env.HOST_URI + ':' + process.env.LOGIN_PORT;
    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    const session_secret = process.env.SESSION_SECRET;
    const redirect_uri = hostUri + '/login/callback';
    const account_uri = process.env.ACCOUNT_URI;
    const post_logout_redirect_uri = hostUri + '/logout/callback';
    const issuer_uri = process.env.ISSUER_URI;

    const kcIssuer = await Issuer.discover(issuer_uri);

    const kcClient = new kcIssuer.Client({
        client_id: client_id,
        client_secret: client_secret,
        redirect_uris: [redirect_uri],
        post_logout_redirect_uris: [post_logout_redirect_uri],
        token_endpoint_auth_method: 'client_secret_post',
        response_types: ['id_token'],
    });

    const kcStrategy = new Strategy({
            client: kcClient
        },
        function (tokenSet, userInfo, done) {
            console.log(tokenSet);
            console.log(userInfo);
            tokenCache = tokenSet['id_token'];
            userInfoCache = userInfo;
            return done(null, tokenSet.claims());
        }
    );


    var tokenCache = undefined;
    var userInfoCache = undefined;

    const app = express();

    app.use(session({
        secret: session_secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            sameSite: 'none',
            secure: true
        },
        store: sessionStore
    }));

    app.use(express.json({ limit: 10 * 1024 * 1024 })); // 10MB json payload limit
    app.use(express.urlencoded({ limit: 10 * 1024 * 1024, extended: true }));

    //app.use(passport.authenticate('session'));

    //app.use(passport.initialize());
    //app.use(passport.session());
    //app.use(passport.authenticate('session'));
    //passport.use('oidc', kcStrategy);

    //passport.serializeUser(function(user, next) {
    //    console.print(user);
    //    next(null, user);
    //});

    //passport.deserializeUser(function(user, next) {
    //    console.print(user);
    //    next(null, user);
    //});

    // login
    app.get('/login-direct/:username/:password', (req, res, next) => {
        console.log(req.session);
        console.log('sessionID = ' + req.session.id);
        req.session.nonce = generators.nonce();
        console.log('/login, nonce = ' + req.session.nonce);

        let body = {
            grant_type: 'password',
            username: req.params.username,
            password: req.params.password
        }

        kcClient.grant(body).then(function (tokenSet) {
            console.log(tokenSet);
            console.log(tokenSet);
            console.log(tokenSet.claims());
    
            if (tokenSet.expired()) {
                console.log('token expired');
                return res.redirect('/auth/fail');
            }
    
            console.log('id_token is valid');
            return res.redirect('/auth/success');
        });
    });
    
    // login
    app.get('/login', (req, res, next) => {
        console.log(req.session);
        console.log('sessionID = ' + req.session.id);
        req.session.nonce = generators.nonce();
        console.log('/login, nonce = ' + req.session.nonce);

        let authUrl = kcClient.authorizationUrl({
            response_mode: 'form_post',
            nonce: req.session.nonce
        });
        console.log(req.session);

        req.session.save(() => res.redirect(authUrl));
        //req.session.user = 'abc';
        //res.send("login");
        //next();
        //passport.authenticate('oidc')(req, res, next);
    });

    // login/callback
    app.get('/login/callback', (req, res, next) => {
        console.log('/login/callback, sessionId = ', req.session.id);
        console.log(req.session);
        //passport.authenticate('oidc', {
        //    successRedirect: '/auth/success',
        //    successMessage: true,
        //    failureRedirect: '/auth/fail',
        //    failureMessage: true
        //})(req, res, next);
    });

    async function authCb(req, res) {
        const params = kcClient.callbackParams(req);
        console.log('nonce=' + req.session);

        if (!req.session.nonce) {
            console.log('invalid nonce');
            return res.redirect('/auth/fail');
        }

        const tokenSet = await kcClient.callback(redirect_uri, params, { nonce: req.session.nonce });
        console.log(tokenSet);
        console.log(tokenSet.claims());

        if (tokenSet.expired()) {
            console.log('token expired');
            return res.redirect('/auth/fail');
        }

        console.log('id_token is valid');
        return res.redirect('/auth/success');
    };

    // login/callback
    app.post('/login/callback', (req, res, next) => {
        console.log('POST /login/callback, sessionId = ', req.sessionID);
        console.log(req.session);
        authCb(req, res);
    });

    app.get('/auth/success', (req, res, next) => {
        console.log('/auth/success');
        return res.send('auth success');
    });

    app.get('/auth/fail', (req, res, next) => {
        console.log('/auth/fail');
        return res.send('auth fail');
    });

    var checkAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) { 
            return next();
            //return res.send('authenticated'); 
        }
        res.send('Not authenticated');
    };

    app.get('/checkauth', checkAuthenticated, (req, res, next) => {
        res.send('');
    });

    // logout
    app.get('/logout', (req, res, next) => {
        console.log('/logout');
        let endUrl = keycloakClient.endSessionUrl({
            id_token_hint: tokenCache
        });
        res.redirect(endUrl);
    });

    // logout callback
    app.get('/logout/callback', (req, res, next) => {
        req.logout();
        res.send('logout callback');
    });

    //unprotected route
    app.get('/', function(req, res, next) {
        res.send('Welcome to 11thD!');
    });

    //const httpServer = app.listen(process.env.LOGIN_PORT, '0.0.0.0');
    //httpServer.on('listening', function() {
    //    console.log('Login httpServer running at %s:%d',
    //        httpServer.address().address, httpServer.address().port);
    //});


    const httpsServer = https.createServer({
        //ca: fs.readFileSync("C:\\Shared\\certs\\11thd-ca-iam.crt"),
        key: fs.readFileSync("C:\\Shared\\certs\\11thd-tileserver-de.pem"),
        cert: fs.readFileSync("C:\\Shared\\certs\\11thd-tileserver.crt"),
    }, app);

    httpsServer.listen(process.env.LOGIN_PORT, '0.0.0.0', () => {
        console.log('Login https server running at %s:%d',
            httpsServer.address().address, httpsServer.address().port);
    });

}