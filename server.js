(function() {
    'use strict';
    /*global console,require,__dirname,process*/
    /*jshint es3:false*/
var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for terminating workers
    cluster.on('exit', function (worker) {
        // Replace the terminated workers
        console.log('Worker ' + worker.id + ' died :('); // eslint-disable-line no-console
        cluster.fork();
    });

// Code to run if we're in a worker process
} else {
	
    var express = require('express');
    var compression = require('compression');
    var fs = require('fs');
    var url = require('url');
    var request = require('request');
   //定义gzip header
    var gzipHeader = Buffer.from("1F8B08", "hex");

    var yargs = require('yargs').options({
        'port' : {
            'default' : process.env.PORT || 8000,
            'description' : 'Port to listen on.'
        },
        'public' : {
            'type' : 'boolean',
            'description' : 'Run a public server that listens on all interfaces.'
        },
        'upstream-proxy' : {
            'description' : 'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".'
        },
        'bypass-upstream-proxy-hosts' : {
            'description' : 'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"'
        },
        'help' : {
            'alias' : 'h',
            'type' : 'boolean',
            'description' : 'Show this help.'
        }
    });
    var argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    var mime = express.static.mime;
    mime.define({
        'application/xml': ['xml'],
        'application/json' : ['czml', 'json', 'geojson', 'topojson'],
		'application/vnd.quantized-mesh' : ['terrain'],
        'model/vnd.gltf+json' : ['gltf'],
        'model/vnd.gltf.binary' : ['glb', 'bgltf'],
        'application/octet-stream' : ['b3dm', 'pnts', 'i3dm', 'cmpt', 'terrain'],
        'text/plain' : ['glsl']        
    });

    var app = express();
    //app.disable('etag');
    app.use(compression());

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
        res.header("X-Powered-By",'3.2.9');
        res.header("Content-Type", "application/json;charset=utf-8");
       	next();
    });

    function checkGzipAndNext(req, res, next) {
        var reqUrl = url.parse(req.url, true);
        var filePath = reqUrl.pathname.substring(1);
        var readStream = fs.createReadStream(filePath, { start: 0, end: 2 });
        console.log(reqUrl);

        readStream.on('error', function(err) {
            next();
        });

        readStream.on('data', function(chunk) {
            console.log(filePath);
            res.header("Content-Type", "application/vnd.quantized-mesh,application/octet-stream;extensions=watermask-metadata");
            if (chunk.equals(gzipHeader)) {
                //res.header('Last-Modified', (new Date()).toUTCString());
                res.header('Content-Encoding', 'gzip');	
            }
            next();
        });
    }

    var knownTilesetFormats = [/\.terrain/, /\.b3dm/, /\.pnts/, /\.i3dm/, /\.cmpt/, /\.glb/, /tileset.*\.json$/];
    app.get(knownTilesetFormats, checkGzipAndNext);

    app.get([/\.json/], function(req, res, next) {
        //res.header('Last-Modified', (new Date()).toUTCString());
        res.header("Content-Type", "application/json;charset=utf-8");
        next();
    });

    app.get([/\.xml/], function(req, res, next) {
        //res.header('Last-Modified', (new Date()).toUTCString());
        res.header("Content-Type", "application/xml;charset=utf-8");
        next();
    });

    app.get([/\.jpg/, /\.jpeg/], function(req, res, next) {
        //res.header('Last-Modified', (new Date()).toUTCString());
        res.header("Content-Type", "image/jpeg");
        next();
    });

    app.get(/\.png/, function(req, res, next) {
        //res.header('Last-Modified', (new Date()).toUTCString());
        res.header("Content-Type", "image/png");
        next();
    });

    app.use(express.static(__dirname));

    var server = app.listen(argv.port, '0.0.0.0', function() {
        if (argv.public) {
            console.log('Cesium data server running publicly.  Connect to http://localhost:%d/', server.address().port);
        } else {
            console.log('Cesium data server running locally.  Connect to http://localhost:%d/', server.address().port);
        }
    });

    server.on('error', function (e) {
        if (e.code === 'EADDRINUSE') {
            console.log('Error: Port %d is already in use, select a different port.', argv.port);
            console.log('Example: node server.js --port %d', argv.port + 1);
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
        console.log('Cesium data server stopped.');
    });

    process.on('SIGINT', function() {
        server.close(function() {
            process.exit(0);
        });
    });
}
})();
