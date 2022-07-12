import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import multer from 'multer';


export function handlePnuBuilding(app) {

    // app: Express
    const PNU_BUILDING = 'tilesets/pnu-building';
    const MAX_PNU_DATA_SIZE = 2 * 1024 * 1024;

    const pycmd = path.join( process.env.PYTHON_PATH, 'python');
    const script = path.join('scripts', 'builder_pnu.pyc');

    function getDataDir(outDir, pnu) {
        return path.join(outDir, 'data', pnu.substr(0, 2), pnu);
    }

    function validatePnu(pnu, res) {
        if (!pnu || pnu.length != 19) {
            console.log('Invalid PNU');
            res.status(400).json({ error: 'Invalid PNU'});
            return false;
        }
        return true;
    }

    function updatePnu(res, pnu, mode, outDir, dataDir) {

        if (!mode) mode = 0;

        // we try get or create data under data_dir itself
        // data dir is a subdir (data/41/46110100102960001) in pnu-building
        console.log('%s %s %s %s %s', pycmd, script, pnu, mode, outDir);
        let cmd = spawn(pycmd, [script, pnu, mode, outDir]);
        cmd.stdout.on('data', (data) => { console.log(data.toString()); })
        cmd.stderr.on('data', (data) => { console.log(data.toString()); })
        cmd.on('close', (code) => {

            console.log('exit code: ' + code);
            if (code != 0) {
                res.status(400).json({ error: 'Unable to create dynamic tileset' });
                return;
            }

            let infoJsonPath = path.join(dataDir, 'info.json');
            if (!fs.existsSync(infoJsonPath)) {
                console.log('unable to create info.json for a given pnu');
                res.status(400).json({ error: 'unable to create info.json for a given pnu'})
                return;
            }

            fs.readFile(infoJsonPath, (error, data) => {
                if (error) {
                    console.log(error);
                    return res.status(500).json({ error: error});
                }

                let pnuJson = JSON.parse(data);
                pnuJson['b3dm'] = path.join('/', outDir, 'pnu.b3dm');
                pnuJson['tileset'] = path.join('/', outDir, 'tileset.json');
                res.status(200).json(pnuJson);
            });
        });
    }

    app.get('/v1/pnu-building/tileset-selected/:pnu/:mode?', function(req, res) {

        if (!validatePnu(req.params.pnu, res)) return;

        let outDir = PNU_BUILDING;
        let dataDir = getDataDir(outDir, req.params.pnu);
        updatePnu(res, req.params.pnu, req.params.mode, outDir, dataDir);
    });

    app.get('/v1/pnu-building/tileset-data/:pnu/:mode?', function(req, res) {

        if (!validatePnu(req.params.pnu, res)) return;

        let dataDir = getDataDir(PNU_BUILDING, req.params.pnu);
        updatePnu(res, req.params.pnu, req.params.mode, dataDir, dataDir);
    });

    app.get('/v1/pnu-building/data/:pnu', function(req, res) {

        if (!validatePnu(req.params.pnu, res)) return;

        const dataDir = getDataDir(PNU_BUILDING, req.params.pnu);

        fs.readdir(dataDir, function (error, files) {
            if (error) {
                return res.status(500).json({ error: "Unable to list files"});
            }

            let fileInfos = [];
            files.forEach((file) => {
                fileInfos.push({ name: file, url: path.join('/', dataDir, file) })
            });
            res.status(200).json(fileInfos);
        })
    })

    app.get('/v1/pnu-building/data/:pnu/:fileName', function(req, res) {

        if (!validatePnu(req.params.pnu, res)) return;

        const dataDir = getDataDir(PNU_BUILDING, req.params.pnu);
        let filePath = path.join(global.__basedir, dataDir, req.params.fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'file not found' });
        }

        res.sendFile(filePath, function(error) {
            if (error) {
                return res.status(400).json({ error: error });
            }

            console.log('file sent');
        });
    });

    app.post('/v1/pnu-building/data/:pnu', function(req, res) {

        if (!validatePnu(req.params.pnu, res)) return;

        const dataDir = getDataDir(PNU_BUILDING, req.params.pnu);
        let pnuDataStorage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(global.__basedir, dataDir));
            },
            filename: (req, file, cb) => {
                console.log(file.originalname);
                cb(null, file.originalname);
            },
        });

        let upload = multer({
            storage: pnuDataStorage,
            limits: { fileSize: MAX_PNU_DATA_SIZE },
        }).single("file");

        upload(req, res, function(error) {
            if (error) {
                return res.status(400).json({ error: 'Unable to upload file', details: error });
            }
            res.status(200).json({ fileUrl: path.join('/', dataDir, req.file.filename) });
        });
    })

}
