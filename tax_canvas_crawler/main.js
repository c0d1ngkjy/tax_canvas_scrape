import puppeteer from 'puppeteer';
import fs from 'fs';

const loadProxies = async () => {
    const data = await fs.promises.readFile('proxyscrape_http_proxies.txt', { encoding: 'utf-8' });
    const proxies = data.split('\n').map(proxy => `http://${proxy.trim()}`);
    return proxies;
};

(async () => {
    // const proxies = await loadProxies();
    // const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    // console.log(`using proxy ${randomProxy}`)
    const browser = await puppeteer.launch({
        headless: true,
        // args: ['--proxy-server=' + randomProxy],
    });
    const page = await browser.newPage();
    const collectedData = [];

    //https://taxlaw.nts.go.kr/pd/USEPDA002P.do?ntstDcmId=200000000000003643&wnkey=71ca479c-5b70-4835-93b9-da231a65c983
    await page.goto('https://taxlaw.nts.go.kr/pd/USEPDI001M.do', { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 1080, height: 1024 });

    await page.waitForSelector('#listMore');
    let totalCount, currentCount;
    do {
        ({ totalCount, currentCount } = await page.evaluate(() => {
            const more = document.querySelector('span.more_wrap');
            totalCount = parseInt(more.querySelector('span.total_count').textContent.trim().split(',').join(''));
            //totalCount = 100; 
            currentCount = parseInt(more.querySelector('span.now_count').textContent.trim());
            return { totalCount, currentCount };
        }));

        if (currentCount < totalCount) {
            await page.click('#listMore');
            await page.waitForFunction(
                ({ prevCount }) => {
                    const more = document.querySelector('span.more_wrap');
                    const newCurrentCount = parseInt(more.querySelector('span.now_count').textContent.trim());
                    return newCurrentCount >= prevCount + 50;
                },
                { timeout: 15000 },
                { prevCount: currentCount }
            );
        
            ({ currentCount } = await page.evaluate(() => {
                const more = document.querySelector('span.more_wrap');
                return { currentCount: parseInt(more.querySelector('span.now_count').textContent.trim()) };
            }));
        }

        console.log('\x1b[33m%s\x1b[0m', `${currentCount} / ${totalCount} <li> ... ${(currentCount / totalCount * 100).toFixed(5)}%`);
    } while (currentCount < totalCount);
    console.log('\x1b[31m%s\x1b[0m', `li tag cnt: ${currentCount}`);

    //await browser.close()

    await page.waitForSelector('#bdltCtl');
    const links = await page.$$('#bdltCtl li > div.board_box > div.substance_wrap > a.subs_title');

    for (let i = 0; i < links.length; i++) {
        const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
        const link = (await page.$$('#bdltCtl li > div.board_box > div.substance_wrap > a.subs_title'))[i];
        await link.click();
        const newPage = await newPagePromise;

        try {
            await newPage.waitForSelector('.board', { timeout: 10000 });
            const data = await newPage.evaluate((index) => {
                const mainContent = document.querySelector('.board');
                let parsedCaption = {};

                if (mainContent) {
                    const title = mainContent.querySelector('div.bo_head > div.title > strong.bold').textContent.trim();
                    const captions = Array.from(mainContent.querySelectorAll('div.bo_head > ul > li'));

                    captions.forEach((caption, idx) => {
                        let element;
                        switch (idx) {
                            case 0:
                                element = caption.querySelector('strong');
                                if (element) parsedCaption.district = element.textContent.trim();
                                break;
                            case 1:
                                element = caption.querySelector('span.num');
                                if (element) parsedCaption.attributionYear = element.textContent.trim();
                                break;
                            case 2:
                                element = caption.querySelector('span');
                                if (element) parsedCaption.instance = element.textContent.trim();
                                break;
                            case 3:
                                element = caption.querySelector('span.num');
                                if (element) parsedCaption.createdDate = element.textContent.trim();
                                break;
                            case 4:
                                element = caption.querySelector('span');
                                if (element) parsedCaption.state = element.textContent.trim();
                                break;
                        }
                    });

                    const scrollArea = document.querySelector('.bo_body_cont');
                    const gist = scrollArea.querySelector('div.word_group > p').textContent.trim();

                    const queryParams = new URLSearchParams(window.location.search);
                    const docId = queryParams.get('ntstDcmId');

                    const contentContainer = document.querySelector('#cntnWrap_html');
                    let contentText = "";
                    if (contentContainer) {
                        const children = Array.from(contentContainer.childNodes);
                        children.forEach(child => {
                            if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.ELEMENT_NODE) {
                                contentText += child.textContent.replace(/[\n\t]/g, '').replace(/\s\s+/g, ' ').trim() + " ";
                            }
                        });
                    }

                    return {
                        index: index,
                        documentId: docId,
                        title: title,
                        caption: parsedCaption,
                        gist: gist,
                        content: contentText.trim()
                    };
                }
                return 'data not found';
            }, i);

            console.log(data);
            collectedData.push(data);
        } catch (error) {
            console.error('timeout or navigation error:', error.message);
        } finally {
            await newPage.close();
        }
    }

    const jsonData = JSON.stringify(collectedData, null, 2);
    fs.writeFileSync('scraped.json', jsonData, 'utf-8');

    await browser.close();
})();
