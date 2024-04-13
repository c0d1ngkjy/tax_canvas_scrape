const url = 'https://taxlaw.nts.go.kr/pd/USEPDI001M.do';
import puppeteer from 'puppeteer';
import fs from 'fs'
import ProgressBar from 'progress';

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.setViewport({ width: 1080, height: 1024 });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    //let total = 10000;
    let total = await page.evaluate(() => Biz.totalCnt);
    let batchSize = 50;
    let docIdList = [];
    var bar = new ProgressBar('processing [:bar] :rate/bps :percent :etas', {
        complete: '*',
        incomplete: '.',
        width: 50,
        total: Math.ceil(total / 50)
    });

    for (let offset = 0; offset <= Math.ceil(total / 50); offset += 1) {
        const currentBatchSize = Math.min(batchSize, total - offset);

        let partialResults = await page.evaluate(async (currentBatchSize, offset) => {
            let partialDocIdList = [];
            Biz.tmp.viewCount = currentBatchSize;
            Biz.tmp.startCount = offset;

            await new Promise((resolve, reject) => {
                Req.doAction("ASIPDI002PR01", Biz.tmp).done(data => {
                    const resultList = data.ASIPDI002PR01.body;
                    resultList.forEach(i => partialDocIdList.push(i.dcm)); 
                    //change to i.dcm.DOC_ID to only fetch ids
                    resolve();
                }).fail(reject);
            });

            return partialDocIdList;
        }, currentBatchSize, offset);

        docIdList = docIdList.concat(partialResults);
        bar.tick(1)
    }


    console.log(`Total IDs fetched: ${docIdList.length}`);
    fs.writeFileSync('scrapedDocIds.json', JSON.stringify(docIdList), 'utf-8');

    await browser.close();
})();



