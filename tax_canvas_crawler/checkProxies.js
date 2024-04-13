import fs from 'fs';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const failedProxies = [];
const filePath = 'f_prox.txt';

async function checkProxy(proxy, index) {
    try {
        const agent = new HttpsProxyAgent(`http://${proxy}`);
        const response = await axios.get('https://httpbin.org/ip', { httpsAgent: agent, timeout: 5000 });
        console.log('\x1b[33m%s\x1b[0m', `proxy ${index} succ: ${proxy} - res: ${response.data.origin}`);

    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m',`proxy ${index} fail: ${proxy} - ${error.message}`);
        failedProxies.push(proxy);
    }
}

async function removeFailedProxies(originalProxies) {
    const workingProxies = originalProxies.filter(proxy => !failedProxies.includes(proxy));

    fs.writeFile(filePath, workingProxies.join('\n'), 'utf8', (err) => {
        if (err) {
            console.error(`err writing filtered proxies to file: ${err}`);
        } else {
            console.log('filtered proxies file');
        }
    });
}

async function main() {
    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            console.error(`err reading file: ${err}`);
        } else {
            let proxies = data.split(/\r?\n/);
            let index = 0;
            for (let proxy of proxies) {
                if (proxy) {
                    await checkProxy(proxy, index);
                }
                index++
            }
            removeFailedProxies(proxies);
        }
    });
}

main();
