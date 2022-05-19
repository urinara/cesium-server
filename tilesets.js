import fs from 'fs';
import url from 'url';

export function checkGzipAndNext(req, res, next) {

    let gzipHeader = Buffer.from("1F8B08", "hex");
    let reqUrl = url.parse(req.url, true);
    let filePath = reqUrl.pathname.substring(1);
    let readStream = fs.createReadStream(filePath, { start: 0, end: 2 });

    readStream.on('error', function(err) {
        next();
    });

    readStream.on('data', function(chunk) {
        res.header("Content-Type", "application/vnd.quantized-mesh,application/octet-stream;extensions=watermask-metadata");
        if (chunk.equals(gzipHeader)) {
            res.header('Content-Encoding', 'gzip');	
        }
        next();
    });
}

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
        res.header("X-Powered-By",'3.2.9');
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

    app.get('/', (req, res) => {
        //console.log(req.url);
        return res.send("11thD Tileset Server");
    });
}