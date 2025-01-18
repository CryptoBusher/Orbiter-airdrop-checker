import fs from "fs";
import { ethers } from "ethers";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";


const RUN_ASYNC = true;  // true / false, если включено - не будет никаких задержек, сразу прохуярит все
const DELAY_RANGE_SEC = [1, 3];  // задержки между аккаунтами, если отключено асинхронное выполнение


const sleep = (sec) => {
	return new Promise(resolve => setTimeout(resolve, sec * 1000));
};


const randInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1) + min);
};


const txtToArray = (filePath) => {
    return fs.readFileSync(filePath, 'utf8').toString().replace(/\r\n/g, '\n').split('\n').filter(n => n);
};


async function signMessage(wallet, message) {
    return await wallet.signMessage(message);
};


const checkOrbiterDrop = async (wallet, proxy=null) => {
    const url = "https://airdrop-api.orbiter.finance/airdrop/snapshot";

    const settings = {
        method: 'POST',
        headers: {
            Token: await signMessage(wallet, "Orbiter Airdrop")
        },
        ...(proxy ? { agent: new HttpsProxyAgent(proxy) } : {}),
    };

    const response = await fetch(url, settings);

    if (![200, 201].includes(response.status)) {
        throw new Error(
            `Unexpected response code: ${response.status}, response: ${await response.text()}`
        );
    }

    const data = await response.json();
    const { result } = data;
    return result == null ? 0 : result.amount;
};


const processWallet = async (privateKey, proxy) => {
    try {
        const wallet = new ethers.Wallet(privateKey);
        const allocation = await checkOrbiterDrop(wallet, proxy);
        console.log(`${wallet.address}: ${allocation}`);
    } catch (error) {
        console.log(`${wallet.address} - check failed: ${error}`);
    }
};


const start = async () => {
    const privateKeys = txtToArray('./privateKeys.txt');
    const proxies = txtToArray('./proxies.txt');
    
    let i = 0;
    for (const privateKey of privateKeys) {
        if (RUN_ASYNC) {
            processWallet(privateKey, proxies[i]);
        } else {
            await processWallet(privateKey, proxies[i]);
            const delaySec = randInt(...DELAY_RANGE_SEC);
            await sleep(delaySec);
        }
    
        i++;
    }
}

start();
