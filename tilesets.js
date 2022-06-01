import fs from 'fs';
import url from 'url';
import path from 'path';
import { spawn } from 'child_process';
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
    // app: Express

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
        res.header("X-Powered-By",'3.2.10');
        res.header("Content-Type", "application/json;charset=utf-8");
       	next();
    });

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

    function update_pnu(res, pnu, mode, outDir) {
        const pypath = process.env.PYTHON_PATH;
        const command = path.join(pypath, 'python');
        const script = 'scripts/builder_pnu.py';

        console.log('%s %s %s %s %s', command, script, pnu, mode, outDir);
        const python = spawn(command, [script, pnu, mode, outDir]);
        python.on('close', (code) => {
            console.log('code=' + code);
            res.send('{"status":"completed."}');
        });
    }

    app.get('/v1/pnu-base/:pnu', function(req, res, next) {
        update_pnu(res, req.params.pnu, '1', 'pnu-base');
    });

    app.get('/v1/pnu-building/:pnu', function(req, res, next) {
        update_pnu(res, req.params.pnu, '0', 'pnu-building');
    });

    app.get('/', (req, res) => {
        //console.log(req.url);
        return res.send("11thD Tileset Server");
    });
}