'use strict';

import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Server } from 'socket.io';
import cluster from 'cluster';
import { handleTiles } from './tilesets.js';
import { handleLogin } from './login.js';
import { handleData } from './data.js';
import 'dotenv/config'


(async function() {

    // spawn worker threads
    if (cluster.isPrimary) {

        let cpuCount = os.cpus().length;
        let numThreads = Math.max(1, cpuCount - 2);
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

    express.static.mime.define({
        'application/xml': ['xml'],
        'application/json' : ['czml', 'json', 'geojson', 'topojson'],
        'application/vnd.quantized-mesh' : ['terrain'],
        'model/vnd.gltf+json' : ['gltf'],
        'model/vnd.gltf.binary' : ['glb', 'bgltf'],
        'application/octet-stream' : ['b3dm', 'pnts', 'i3dm', 'cmpt', 'terrain'],
        'text/plain' : ['glsl']        
    })

    const app = express();

    // 3D Tileset handlers
    handleTiles(app);

    // serve the static files (3d tiles, json, etc)
    app.use(express.static(path.dirname(fileURLToPath(import.meta.url))));

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


