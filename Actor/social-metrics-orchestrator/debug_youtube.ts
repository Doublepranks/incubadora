
import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function testYoutubeScraper(username: string) {
    console.log(`Testing YouTube scraper for: ${username}`);

    // Launch args same as src/main.ts
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set headers (IMPORTANT: En-US)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
    });

    const url = `https://www.youtube.com/@${username}`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    await new Promise(r => setTimeout(r, 5000));

    // Get ytInitialData
    const initialData = await page.evaluate(() => {
        // @ts-ignore
        return window.ytInitialData;
    });

    if (initialData) {
        console.log('Found ytInitialData!');
        const strData = JSON.stringify(initialData);

        // 1. Regex Legacy
        const subMatch = strData.match(/"subscriberCountText":\s*{[^}]*"simpleText":\s*"([^"]+)"/);
        if (subMatch) console.log(`Legacy Sub Match: ${subMatch[1]}`);

        const videoMatch = strData.match(/"videoCountText":\s*{[^}]*"simpleText":\s*"([^"]+)"/);
        if (videoMatch) console.log(`Legacy Video Match: ${videoMatch[1]}`);

        // 2. New Logic
        try {
            const header = (initialData as any)?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
            if (header?.metadata?.contentMetadataViewModel?.metadataRows) {
                console.log('✅ Found contentMetadataViewModel');
                const rows = header.metadata.contentMetadataViewModel.metadataRows;
                for (const row of rows) {
                    if (row.metadataParts) {
                        for (const part of row.metadataParts) {
                            const text = part?.text?.content;
                            console.log(`- Text part: "${text}"`);
                        }
                    }
                }
            } else {
                console.log('❌ contentMetadataViewModel NOT found');
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        console.log('ytInitialData not found');
    }

    await browser.close();
}

testYoutubeScraper('MrBeast');
