import express from 'express';
import { Issuer, Strategy } from 'openid-client';
import passport from 'passport';
import session from 'express-session';
import 'dotenv/config'


export async function handleLogin() {

    const hostUri = process.env.HOST_URI + ':' + process.env.LOGIN_PORT;
    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    const session_secret = process.env.SESSION_SECRET;
    const redirect_uri = hostUri + '/auth/callback';
    const account_uri = process.env.ACCOUNT_URI;
    const post_logout_redirect_uri = hostUri + '/logout/callback';
    const issuer_uri = process.env.ISSUER_URI;

    const keycloakIssuer = await Issuer.discover(issuer_uri);
    const keycloakClient = new keycloakIssuer.Client({
        client_id: client_id,
        client_secret: client_secret,
        redirect_uris: [redirect_uri],
        post_logout_redirect_uris: [post_logout_redirect_uri],
        //token_endpoint_auth_method: 'client_secret_post',
        response_types: ['code'],
    });

    var memoryStore = new session.MemoryStore();
    var tokenCache = undefined;
    var userInfoCache = undefined;

    const app = express();

    app.use(session({
        secret: session_secret,
        resave: false,
        saveUninitialized: false,
        store: memoryStore
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    //app.use(passport.authenticate('session'));

    passport.use('oidc', new Strategy({client: keycloakClient}, (tokenSet, userInfo, done) => {
        tokenCache = tokenSet['id_token'];
        userInfoCache = userInfo;
        return done(null, tokenSet.claims());
    }));

    passport.serializeUser(function(user, next) {
        next(null, user);
    });

    passport.deserializeUser(function(user, next) {
        next(null, user);
    });

    // login
    app.get('/login', (req, res, next) => {
        passport.authenticate('oidc')(req, res, next);
    });

    // auth/callback 
    app.get('/auth/callback', (req, res, next) => {
        passport.authenticate('oidc', {
            successRedirect: account_uri,
            failureRedirect: '/login'
          })(req, res, next);      
    });

    var checkAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) { 
            return next() 
        }
        res.redirect("/test")
    }

    // start logout request
    app.get('/logout', (req, res) => {
        res.redirect(keycloakClient.endSessionUrl({
            id_token_hint: tokenCache
        }));
    });

    // logout callback
    app.get('/logout/callback', (req, res) => {
        res.redirect('/login');
    });

    //unprotected route
    app.get('/', function(req, res) {
        res.send('11thD home')
    });
    
    const server = app.listen(process.env.LOGIN_PORT, '0.0.0.0');
    server.on('listening', function() {
        console.log('Login server running at %s:%d',
            server.address().address, server.address().port);
    });

}