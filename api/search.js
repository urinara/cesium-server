import fs, { exists } from 'fs';
import path from 'path';
import format from 'pg-format';
import dotenv from 'dotenv';
import glob from 'glob';


export function handleSearch(app, pgPool) {
    // app: Express
    //dotenv.config({path: '.database'})

    const schema = process.env.PG_SCHEMA;
    const tableBjd = 'beop_jeong_dong_codes';
    const tablePnus = 'pnus';

    async function check_table(tableName) {

        let exists = false;

        try {
            let sql = "SELECT * FROM information_schema.tables";
            sql += ` WHERE table_name='${tableName}' AND table_schema='${schema}'`;
            let results = await pgPool.query(sql);
            exists = results.rowCount > 0;
        } catch (error) {
            console.error(error);
        }

        return exists;
    }

    // function parseQuery(query) {
    //     // parse the original query term
    //     let term = query;

    //     // Suppress single letters except 산
    //     //term = term.replace(/(?<=\s)\D(?=\s)/g, ' ');
    //     //console.log(term)

    //     //# multi-spaces to single space
    //     //term = re.sub(r'\s\s+', ' ', query.strip().rstrip())
    //     term = term.replace(/\s\s+/g, ' ').trim();
    //     //console.log(term)

    //     //# treat as postfix 시/도/군/구/읍/면/동/리/진
    //     //term = re.sub(r'\s([시도군구읍면동리진]\s)', r'\1', term)
    //     //term = term.replace(/\s([시도군구읍면동리진]\s)/g, '$1');
    //     //console.log(term)

    //     //# 도 in 시도
    //     let sido = ''
    //     let do_regex = /(^|\s)(?<m0>(충청?[북남]|경상?[북남]|전라?[북남]|제주(특별(자치)?)?|경기|강원)도?)($|\s)/;
    //     let match = do_regex.exec(term);
    //     if (match !== null) {
    //         sido = match.groups.m0
    //         term = term.replace(sido, '').trim()
    //     }

    //     //# 시 in 시도
    //     let si_regex = /(^|\s)(?<m0>(서울|부산|인천|대구|광주|대전|울산|세종)(특별(자치)?|광역|직할)?시?)($|\s)/;
    //     match = si_regex.exec(term)
    //     if (match !== null) {
    //         let si = match.groups.m0; // # si take a priority
    //         if (si.indexOf('광주') < 0 || sido.indexOf('경기') < 0) {
    //             sido = si;
    //             term = term.replace(sido, '').trim();
    //         }
    //     }

    //     sido = sido.replace(/.*(서울).*/, '$1특별시');
    //     sido = sido.replace(/.*(부산|인천|대구|광주|대전|울산).*/, '$1광역시');
    //     sido = sido.replace(/.*(세종).*/, '$1특별자치시');
    //     sido = sido.replace(/.*(충).*(북|남).*/, '$1청$2도');
    //     sido = sido.replace(/.*(전).*(북|남).*/, '$1라$2도');
    //     sido = sido.replace(/.*(경).*(북|남).*/, '$1상$2도');
    //     sido = sido.replace(/.*(경기).*/, '$1도');
    //     sido = sido.replace(/.*(강원).*/, '$1도');
    //     sido = sido.replace(/.*(제주).*/, '$1특별자치도');
    //     //console.log('시도: ' + sido);

    //     //# 시군구(진)
    //     let sigungu = '';
    //     let sigungu_regex = /(^|\s)(?<m0>[가-힣]\S*시\s[가-힣]\S*구|[가-힣]\S*[시군구진])($|\s)/;
    //     match = sigungu_regex.exec(term);
    //     if (match !== null) {
    //         sigungu = match.groups.m0;
    //         term = term.replace(sigungu, '').trim();
    //     }
    //     //console.log('시군구: ' + sigungu);

    //     //# 읍면동(한자)
    //     let emd = '';
    //     let emd_regex = /(^|\s)(?<m0>[가-힣]\S*[읍면동가로](\s?\(\S+\))?)($|\s)/;
    //     match = emd_regex.exec(term);
    //     if (match !== null) {
    //         emd = match.groups.m0;
    //         term = term.replace(emd, '').trim();
    //     }
    //     //console.log('읍면동: ' + emd);

    //     //# 리(한자)
    //     let ri = ''
    //     let ri_regex = /(^|\s)(?<m0>[가-힣]\S*리(\s?\(\S+\))?)($|\s)/;
    //     match = ri_regex.exec(term);
    //     if (match !== null) {
    //         ri = match.groups.m0.trim();
    //         term = term.replace(ri, '').trim();
    //     }
    //     //console.log('리: ' + ri);

    //     //# Now try to do a general match sequentially
    //     if (!sigungu) {
    //         match = /(^|\s)(?<m0>[가-힣]\S*[가-힣])($|\s)/.exec(term);
    //         if (match !== null) {
    //             sigungu = match.groups.m0;
    //             term = term.replace(sigungu, '').trim();
    //             //sigungu += sido.endsWith('도') ? '시' : '구';
    //         }
    //     }

    //     if (!emd) {
    //         match = /(^|\s)(?<m0>[가-힣]\S*[가-힣](\s?\(\S+\))?)/.exec(term);
    //         if (match !== null) {
    //             emd = match.groups.m0;
    //             term = term.replace(emd, '').trim();
    //             //emd += sigungu.endsWith('시') ? '구' : '동';
    //         }
    //     }

    //     if (!ri) {
    //         match = /(^|\s)(?<m0>[가-힣]\S*[가-힣](\s?\(\S+\))?)/.exec(term);
    //         if (match !== null) {
    //             ri = match.groups.m0.trim();
    //             term = term.replace(ri, '').trim();
    //             //ri +=  emd.endsWith('구') ? '동' : '리';
    //         }
    //     }

    //     //# 필지구분 (일반/산)
    //     let san = ''
    //     let san_regex = /(^|\s)(?<san>산)(?=[\d ])/;
    //     match = san_regex.exec(term);
    //     if (match !== null) {
    //         san = match.groups.san;
    //         term = term.replace(san, '').trim();
    //     }
    //     //console.log('일반/산: ' + san);

    //     //# 지번본번/부번
    //     let num1 = '';
    //     let num2 = '';
    //     let num_regex = /(^|\s)[\s산]?(?<num1>\d+)\D?(?<num2>\d+)?($|\s)/;
    //     match = num_regex.exec(term);
    //     if (match !== null) {
    //         num1 = match.groups.num1;
    //         num1 = num1 ? num1.substring(0, 4) : '';
    //         num2 = match.groups.num2;
    //         num2 = num2 ? num2.substring(0, 4) : '';
    //     }
    //     //console.log('본번: ' + num1 + ', 부번: ' + num2)

    //     let bjd = sido
    //     bjd += (sigungu ? ' ' + sigungu : '');
    //     bjd += (emd ? ' ' + emd : '');
    //     bjd += (ri ? ' ' + ri : '');

    //     let jibeon = san
    //     jibeon += (san ? ' ' + num1 : num1);
    //     jibeon += (num2 ? '-' + num2 : '');

    //     let result = bjd + (jibeon ? ' ' : '') + jibeon;
    //     //console.log(result);

    //     let bjdFilter = sido;
    //     bjdFilter += ' ' + sigungu;
    //     bjdFilter += ' ' + emd;
    //     bjdFilter += ' ' + ri;
    //     bjdFilter += ' ';
    //     bjdFilter = bjdFilter.replace(/\s+/g, '%');

    //     return {
    //         sido: sido,
    //         sigungu: sigungu,
    //         emd: emd,
    //         ri: ri,
    //         san: san,
    //         num1: num1,
    //         num2: num2,
    //         bjd: bjd,
    //         jibeon: jibeon,
    //         result: result,
    //         bjdFilter: bjdFilter
    //     }
    // }

    function parseQuery2(query) {
        // parse the original query term
        let term = query;
        let match;

        //# multi-spaces to single space
        term = term.replace(/\s\s+/g, ' ').trim();

        //# 필지구분 (일반/산) + 지번 + 부번
        let san = ''
        let num1 = '';
        let num2 = '';
        let san_regex = /(?:^|\s)(?<san>산)?\s?(?<num1>\d+)\D?(?<num2>\d+)?(?:\s|$)/;
        match = san_regex.exec(term);
        if (match !== null) {
            san = match.groups.san ? match.groups.san : '';
            num1 = match.groups.num1 ? match.groups.num1 : '';
            num2 = match.groups.num2 ? match.groups.num2 : '';
            num1 = num1 ? num1.substring(0, 4) : '';
            num2 = num2 ? num2.substring(0, 4) : '';
            term = term.replace(match[0], '').trim();
        }
        //console.log('일반/산: ' + san);

        //# 도 in 시도
        let sido = ''
        let do_regex = /(^|\s)(?<m0>(충청?[북남]|경상?[북남]|전라?[북남]|제주(특별(자치)?)?|경기|강원)도?)($|\s)/;
        match = do_regex.exec(term);
        if (match !== null) {
            sido = match.groups.m0
            term = term.replace(sido, '').trim()
        }

        //# 시 in 시도
        let si_regex = /(^|\s)(?<m0>(서울|부산|인천|대구|광주|대전|울산|세종)(특별(자치)?|광역|직할)?시?)($|\s)/;
        match = si_regex.exec(term)
        if (match !== null) {
            let si = match.groups.m0; // # si take a priority
            if (si.indexOf('광주') < 0 || sido.indexOf('경기') < 0) {
                sido = si;
                term = term.replace(sido, '').trim();
            }
        }

        sido = sido.replace(/.*(서울).*/, '$1특별시');
        sido = sido.replace(/.*(부산|인천|대구|광주|대전|울산).*/, '$1광역시');
        sido = sido.replace(/.*(세종).*/, '$1특별자치시');
        sido = sido.replace(/.*(충).*(북|남).*/, '$1청$2도');
        sido = sido.replace(/.*(전).*(북|남).*/, '$1라$2도');
        sido = sido.replace(/.*(경).*(북|남).*/, '$1상$2도');
        sido = sido.replace(/.*(경기).*/, '$1도');
        sido = sido.replace(/.*(강원).*/, '$1도');
        sido = sido.replace(/.*(제주).*/, '$1특별자치도');
        //console.log('시도: ' + sido);

        //# 시군구(진), 읍면동(한자), 리(한자)
        let sigungu = '';
        let emd = '';
        let ri = ''

        let regex = /(?:^|\s)?(?<m0>[가-힣]\S*[가-힣](\s?\(\S+\))?)(?:\s|$)/gu;
        let matches = term.matchAll(regex);
        for (match of matches) {
            console.log(match.groups.m0);
            let m0 = match.groups.m0;
            sigungu = sigungu + ' ' + m0;
        }

        let bjdFilter = sido;
        bjdFilter += ' ' + sigungu;
        bjdFilter += ' ' + emd;
        bjdFilter += ' ' + ri;
        bjdFilter += ' ';
        bjdFilter = bjdFilter.replace(/\s+/g, '%');

        return {
            sido: sido,
            sigungu: sigungu,
            emd: emd,
            ri: ri,
            san: san,
            num1: num1,
            num2: num2,
            bjdFilter: bjdFilter
        }
    }

    async function getPnus(parsed, bjdCode, bjdName, req, res) {

        let wildSearch = false;
        let pnuFilter = bjdCode;
        pnuFilter += (parsed.san ? '2' : '1');
        pnuFilter += (parsed.num1 ? parsed.num1.padStart(4, '0') : '');
        pnuFilter += (parsed.num2 ? parsed.num2.padStart(4, '0') : '');
        if (!parsed.num1 || !parsed.num2) {
            wildSearch = true;
            pnuFilter = pnuFilter + '%';
        }

        let tableName = tablePnus + '_' + bjdCode.substring(0, 2);
        let exists = await check_table(tableName);
        if (!exists) {
            console.log(`${tableName} does not exists.`);
            return res.status(200).json({ results: [] });
        }

        let pnuSql = wildSearch
            ? format('SELECT %I FROM %I.%I WHERE %I LIKE %L LIMIT 10', 'pnu', schema, tableName, 'pnu', pnuFilter)
            : format('SELECT %I FROM %I.%I WHERE %I = %L', 'pnu', schema, tableName, 'pnu', pnuFilter);
        console.log(pnuSql);

        pgPool.query(pnuSql, (error, results) => {
            if (error) {
                console.log(error);
                return res.status(400).json({ error: 'Bad input parameters' });
            }

            let outputs = [];

            for (let row of results.rows) {
                let address = bjdName;
                address += (parsed.san ? ' ' + parsed.san : '');
                let num1 = parseInt(row.pnu.substring(11, 15));
                let num2 = parseInt(row.pnu.substring(15));
                address += (num1 > 0 ? ' ' + num1 : '');
                address += (num2 > 0 ? '-' + num2 : '');
                outputs.push({ pnu: row.pnu, address: address })
            }

            console.log(outputs);
            return res.status(200).json({ results: outputs });
        })
    }

    function getBjd(parsed, req, res) {

        let bjdSql = format('SELECT * FROM %I.%I WHERE %I = %L AND %I LIKE %L LIMIT 1',
            schema, tableBjd, 'in_use', 1, 'name', parsed.bjdFilter);
        console.log(bjdSql);

        pgPool.query(bjdSql, (error, results) => {
            if (error) {
                console.log(error);
                return res.status(400).json({ error: 'Bad input parameters' });
            }

            if (results.rowCount === 0) {
                return res.status(200).json({ results: [] });
            }

            let bjdCode = results.rows[0].code;
            let bjdName = results.rows[0].name;
            console.log(results.rows[0]);
            getPnus(parsed, bjdCode, bjdName, req, res);
        });
    }

    app.get('/v1/address/search/jibeon/:query', function(req, res) {
        let parsed = parseQuery2(req.params.query);
        console.log(parsed);
        getBjd(parsed, req, res);
    });

}
