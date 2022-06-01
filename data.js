'use strict';

import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cluster from 'cluster';
import { handleTiles } from './tilesets.js';
import { handleLogin } from './login.js';
import 'dotenv/config'


export function handleData() {

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    app.use(express.static(path.dirname(fileURLToPath(import.meta.url))));

    app.get('/', (req, res) => { 
        res.sendFile('index.html');
    });

    io.on('connection', (socket) => {
        console.log('a user connected');
        socket.on('chat message', (msg) => {
            console.log('message: ' + msg);
            socket.emit('chat message', 'hi 1'); // every one except sender
            io.emit('chat message', 'it is me'); // to every one
            socket.broadcast.emit('chat message', 'Morpheus is dead!'); // every one except sender
        });
        socket.on('disconnect', () => {
          console.log('user disconnected');
        });
    });

    server.listen(process.env.DATA_PORT);
    server.on('listening', () => {
        console.log('Data server running at %s:%d',
            server.address().address, server.address().port);
    });
}


