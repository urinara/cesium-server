import fs from 'fs';
import url from 'url';
import { fileURLToPath } from 'url';
import express from 'express';
import path from 'path';
import 'dotenv/config';


export function checkGzip(req, res) {

    const gzipHeader = Buffer.from("1F8B08", "hex");
    const reqUrl = url.parse(req.url, true);
    const filePath = reqUrl.pathname.substring(1);
    const fid = fs.openSync(filePath);
    const buffer = Buffer.alloc(3);

    fs.readSync(fid, buffer, 0, 3, 0);
    fs.closeSync(fid);

    return buffer.equals(gzipHeader);
}

export function handleTiles(app) {

    //express.static.mime.define({
    //    'application/xml': ['xml'],
    //    'application/json' : ['czml', 'json', 'geojson', 'topojson'],
    //    'application/vnd.quantized-mesh' : ['terrain'],
    //    'model/vnd.gltf+json' : ['gltf'],
    //    'model/vnd.gltf.binary' : ['glb', 'bgltf'],
    //    'application/octet-stream' : ['b3dm', 'pnts', 'i3dm', 'cmpt', 'terrain'],
    //    'text/plain' : ['glsl']        
    //})

    // Routes
    app.get('/*.terrain', function(req, res, next) {
        //console.log(req.url);
        res.header("Content-Type", "application/vnd.quantized-mesh,application/octet-stream;extensions=watermask-metadata");
        if (checkGzip(req, res)) {
            res.header('Content-Encoding', 'gzip');
        }
        next();
    });

    app.get(['/*.b3dm', '/*.pnts', '/*.i3dm', '/*.cmpt', '/*.glb'], function(req, res, next) {
        //console.log(req.url);
        res.header("Content-Type", "application/octet-stream");
        if (checkGzip(req, res)) {
            res.header('Content-Encoding', 'gzip');	
        }
        next();
    });

    app.get(['/*.json', '/*tileset*.json'], function(req, res, next) {
        //console.log(req.url);
        res.header("Content-Type", "application/json;charset=utf-8");
        next();
    });

    app.get(['/*.xml'], function(req, res, next) {
        //console.log(req.url);
        res.header("Content-Type", "application/xml;charset=utf-8");
        next();
    });

    app.get(['/*.jpg', '/*.jpeg'], function(req, res, next) {
        //console.log(req.url);
        res.header("Content-Type", "image/jpeg");
        next();
    });

    app.get('/*.png', function(req, res, next) {
        //console.log(req.url);
        res.header("Content-Type", "image/png");
        next();
    });

    // serve the static files (3d tiles, json, etc)
   app.use('/tilesets', express.static(path.join(global.__basedir, 'tilesets')));
}
 