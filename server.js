'use strict';

import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Server } from 'socket.io';
import cluster from 'cluster';
import { handleTiles } from './api/tilesets.js';
import { handleLogin } from './api/login.js';
import { handleData } from './api/data.js';
import { handleBookmarks } from './api/bookmarks.js';
import cors from 'cors';
import { handlePnuBuilding } from './api/pnu-building.js';
import 'dotenv/config'


global.__basedir = path.dirname(fileURLToPath(import.meta.url)); 

(async function() {

    // spawn worker threads
    if (cluster.isPrimary) {

        let cpuCount = os.cpus().length;
        let numThreads = Math.max(1, cpuCount / 2);
        for (let i = 0; i < numThreads; i++) {
            cluster.fork();
        }

        cluster.on('exit', function (worker) {
            console.log('Worker %d died.', worker.id);
            cluster.fork(); // fork again
        });
    
        //handleLogin();
        handleData();
        return;
    }

    const app = express();

    //const corsA = cors({
    //    origin: 'http://localhost:4200'
    //});
    //app.use(corsA);

    // TODO: replace with a proper CORS implementation
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
        res.header("X-Powered-By",'0.1.0');
        res.header("Content-Type", "application/json;charset=utf-8");
       	next();
    });

    app.use(express.json({ limit: 10 * 1024 * 1024 })); // 10MB json payload limit
    app.use(express.urlencoded({ extended: true }));

    // Handle pnu-building
    handlePnuBuilding(app);

    // Handle bookmark API
    handleBookmarks(app);

    // For the rest, 3D Tileset handlers
    handleTiles(app);

    // Launch server
    const server = app.listen(process.env.TILESET_PORT, '0.0.0.0');

    server.on('listening', function() {
        console.log('Tileset server running at %s:%d',
            server.address().address, server.address().port);
    });

    server.on('connection', function(socket) {
        console.log('connected from %s in id=%d', socket.remoteAddress, cluster.worker.id);
    });

    server.on('error', function (e) {
        if (e.code === 'EADDRINUSE') {
            console.log('Error: Port %d is already in use.', argv.port);
        } else if (e.code === 'EACCES') {
            console.log('Error: This process does not have permission to listen on port %d.', argv.port);
            if (argv.port < 1024) {
                console.log('Try a port number higher than 1024.');
            }
        }
        console.log(e);
        process.exit(1);
    });

    server.on('close', function() {
        console.log('Tileset server stopped.');
    });

    process.on('SIGINT', function() {
        server.close(function() {
            process.exit(0);
        });
    });

})();


