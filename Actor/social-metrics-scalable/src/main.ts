import { Actor } from 'apify';
import { ApifyClient } from 'apify-client';
import { PuppeteerCrawler } from 'crawlee';

interface ProfileInput {
    platform: 'instagram' | 'tiktok' | 'youtube' | 'x' | 'kwai';
    username: string;
    url?: string;
}

interface ActorInput {
    profiles: ProfileInput[];
}

interface MetricResult {
    platform: string;
    username: string;
    date: string;
    followers_count: number | null;
    posts_count: number | null;
    sync_status: 'ok' | 'error';
    error_code: string | null;
    error_message: string | null;
    attempt: number;
    runId: string;
    sourceActorId: string | null;
}

// IDs dos actors da Apify Store
const ACTOR_IDS: Record<string, string> = {
    instagram: 'apify/instagram-profile-scraper',
    tiktok: 'apidojo/tiktok-scraper',
    x: 'apidojo/twitter-user-scraper',
};

await Actor.init();

const input = await Actor.getInput<ActorInput>();
if (!input?.profiles) {
    throw new Error('Input must contain profiles array');
}

const runId = Actor.getEnv().actorRunId ?? 'local-run';
const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

const date = new Date().toISOString().split('T')[0];
const results: MetricResult[] = [];

// Agrupar perfis por plataforma
const profilesByPlatform = new Map<string, ProfileInput[]>();
for (const profile of input.profiles) {
    const existing = profilesByPlatform.get(profile.platform) || [];
    existing.push(profile);
    profilesByPlatform.set(profile.platform, existing);
}

// Processar cada plataforma
// Soft timeout configuration (55 minutes) to ensure graceful shutdown before platform kills it
const SOFT_TIMEOUT_MS = 55 * 60 * 1000;
const startTime = Date.now();

function isTimeRunningOut(): boolean {
    return (Date.now() - startTime) > SOFT_TIMEOUT_MS;
}

// Helper to push result immediately
async function pushResult(result: MetricResult) {
    results.push(result);
    await Actor.pushData(result);
}

// Helper function to process a single platform
async function processPlatform(platform: string, platformProfiles: ProfileInput[]) {
    if (isTimeRunningOut()) {
        console.warn(`🛑 Soft timeout encountered. Skipping ${platform}.`);
        return;
    }

    console.log(`\n📱 Processing ${platform}: ${platformProfiles.length} profiles`);

    if (platform === 'kwai') {
        console.log('🔧 Using custom Puppeteer scraper for Kwai...');
        const kwaiResults = await scrapeKwaiProfiles(platformProfiles, date);
        for (const res of kwaiResults) {
            await pushResult(res);
        }
        return;
    }

    if (platform === 'youtube') {
        console.log('🔧 Using custom Puppeteer scraper for YouTube...');
        const youtubeResults = await scrapeYoutubeProfiles(platformProfiles, date);
        for (const res of youtubeResults) {
            await pushResult(res);
        }
        return;
    }

    const actorId = ACTOR_IDS[platform];
    if (!actorId) {
        console.log(`⚠️ No actor configured for ${platform}`);
        for (const profile of platformProfiles) {
            await pushResult({
                platform,
                username: profile.username,
                date,
                followers_count: null,
                posts_count: null,
                sync_status: 'error',
                error_code: 'no_actor',
                error_message: `No actor configured for platform: ${platform}`,
                attempt: 1,
                runId,
                sourceActorId: null,
            });
        }
        return;
    }

    if (platform === 'x') {
        // Special handling for X - call individually to isolate failures/limits
        console.log(`🛡️ Isolating calls for ${platform} to prevent limit exhaustion/batch failures`);

        for (const profile of platformProfiles) {
            try {
                // Call actor for single profile
                const singleInput = buildActorInput(platform, [profile]);
                console.log(`🚀 Calling actor ${actorId} for ${profile.username}`);

                // Add delay to ensure previous container is cleaned up and memory released
                if (platformProfiles.indexOf(profile) > 0) {
                    await new Promise(r => setTimeout(r, 5000));
                }

                if (isTimeRunningOut()) {
                    console.warn(`🛑 Soft timeout encountered while processing X profiles. Skipping ${profile.username}`);
                    break; // This break will only exit the inner loop for X profiles
                }

                const run = await client.actor(actorId).call(singleInput, {
                    memory: 512, // Reduced to 512 to save account memory
                    // timeout removed as requested
                });

                // Get results
                const { items } = await client.dataset(run.defaultDatasetId).listItems();
                console.log(`✅ ${profile.username}: Got ${items.length} items`);

                // Normalize result
                let found = false;
                for (const item of items) {
                    const normalized = normalizeResult(platform, item as Record<string, unknown>, [profile], date);
                    if (normalized) {
                        await pushResult(normalized);
                        found = true;
                    }
                }

                if (!found) {
                    console.log(`⚠️ Profile missing from results: ${platform}/${profile.username}`);
                    await pushResult({
                        platform,
                        username: profile.username,
                        date,
                        followers_count: null,
                        posts_count: null,
                        sync_status: 'error',
                        error_code: 'not_found',
                        error_message: 'Profile not found or no valid data returned',
                        attempt: 1,
                        runId,
                        sourceActorId: actorId,
                    });
                }

            } catch (error) {
                console.error(`❌ Error with ${platform}/${profile.username}:`, error);
                await pushResult({
                    platform,
                    username: profile.username,
                    date,
                    followers_count: null,
                    posts_count: null,
                    sync_status: 'error',
                    error_code: errorCodeFromError(error),
                    error_message: error instanceof Error ? error.message : String(error),
                    attempt: 1,
                    runId,
                    sourceActorId: actorId,
                });
            }
        }
        return;
    }

    if (isTimeRunningOut()) {
        console.warn(`🛑 Soft timeout encountered. Skipping ${platform}.`);
        return;
    }

    try {
        // ... (standard batch logic for other platforms)
        // Preparar input para o actor específico
        const actorInput = buildActorInput(platform, platformProfiles);

        console.log(`🚀 Calling actor: ${actorId}`);
        console.log(`   Input:`, JSON.stringify(actorInput, null, 2));

        // Chamar o actor e esperar resultado
        const run = await client.actor(actorId).call(actorInput, {
            memory: 1024,
            timeout: 300, // 5 minutos
        });

        // Buscar resultados do dataset
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`✅ Got ${items.length} results from ${actorId}`);

        // Normalizar resultados
        for (const item of items) {
            const normalized = normalizeResult(platform, item as Record<string, unknown>, platformProfiles, date);
            if (normalized) {
                await pushResult(normalized);
            }
        }

        // Verificar se algum perfil não foi encontrado
        const foundUsernames = results
            .filter(r => r.platform === platform)
            .map(r => r.username.toLowerCase());

        for (const profile of platformProfiles) {
            if (!foundUsernames.includes(profile.username.toLowerCase())) {
                console.log(`⚠️ Profile missing from results: ${platform}/${profile.username}`);
                await pushResult({
                    platform,
                    username: profile.username,
                    date,
                    followers_count: null,
                    posts_count: null,
                    sync_status: 'error',
                    error_code: 'not_found',
                    error_message: 'Profile not found in actor results',
                    attempt: 1,
                    runId,
                    sourceActorId: actorId,
                });
            }
        }

    } catch (error) {
        console.error(`❌ Error with ${platform}:`, error);

        // Marcar todos os perfis desta plataforma como erro
        for (const profile of platformProfiles) {
            await pushResult({
                platform,
                username: profile.username,
                date,
                followers_count: null,
                posts_count: null,
                sync_status: 'error',
                error_code: errorCodeFromError(error),
                error_message: error instanceof Error ? error.message : String(error),
                attempt: 1,
                runId,
                sourceActorId: actorId,
            });
        }
    }
}

// EXECUTE PLATFORMS IN PARALLEL
const platforms = Array.from(profilesByPlatform.keys());
console.log(`🚀 Starting parallel execution for ${platforms.length} platforms`);

await Promise.all(platforms.map(async (platform) => {
    const platformProfiles = profilesByPlatform.get(platform) || [];
    if (platformProfiles.length > 0) {
        await processPlatform(platform, platformProfiles);
    }
}));


// Remove the final massive push loop as data is pushed incrementally
// for (const result of results) {
//     await Actor.pushData(result);
// }

console.log(`\n📊 Summary:`);
console.log(`   Total results: ${results.length}`);
console.log(`   ✅ Success: ${results.filter(r => r.sync_status === 'ok').length}`);
console.log(`   ❌ Failed: ${results.filter(r => r.sync_status === 'error').length}`);

await Actor.exit();

// ============ HELPERS ============

function buildActorInput(platform: string, profiles: ProfileInput[]): Record<string, unknown> {
    const usernames = profiles.map(p => p.username);

    switch (platform) {
        case 'instagram':
            return {
                usernames,
                resultsLimit: 1,
            };

        case 'tiktok':
            // apidojo/tiktok-scraper
            return {
                startUrls: usernames.map(u => `https://www.tiktok.com/@${u}`),
                maxItems: profiles.length * 2, // Give some buffer
                customMapFunction: "(object) => { return {...object} }",
            };

        case 'youtube':
            // streamers/youtube-channel-scraper expects startUrls
            return {
                startUrls: usernames.flatMap(u => [
                    { url: `https://www.youtube.com/@${u}` },
                    { url: `https://www.youtube.com/c/${u}` },
                    { url: `https://www.youtube.com/user/${u}` }
                ]),
                maxResults: 999,
            };

        case 'x':
            // apidojo/twitter-user-scraper expects twitterHandles
            return {
                twitterHandles: usernames,
                // Limit to small number to avoid hitting free tier limits with followers/following
                // We just want the profile info which comes with the user object
                tweetsDesired: 5,
                followersDesired: 0,
                followingDesired: 0,
                includeUserInfo: true,
            };

        default:
            return { usernames };
    }
}

function normalizeResult(
    platform: string,
    item: Record<string, unknown>,
    profiles: ProfileInput[],
    date: string
): MetricResult | null {
    try {
        let username = '';
        let followers = 0;
        let posts = 0;

        switch (platform) {
            case 'instagram':
                username = String(item.username || item.ownerUsername || '');
                followers = Number(item.followersCount || item.followers || 0);
                posts = Number(item.postsCount || item.posts || 0);
                break;

            case 'tiktok':
                // apidojo/tiktok-scraper result normalization

                // Case 0: No results or empty
                if (item.noResults) {
                    return null;
                }

                // We try multiple locations where user data might appear
                let authorDetails: any = item.authorMeta || item.authorStats || item.author || null;

                // Case 1: Direct user object
                if (!authorDetails && item.uniqueId) {
                    authorDetails = item;
                }

                // Case 2: Video object with 'channel' (apidojo common format)
                if (!authorDetails && item.channel) {
                    const ch = item.channel as any;
                    // Prioritize username handle!
                    username = String(ch.username || ch.id || ch.name || '');

                    // Extract stats from channel
                    if (ch.followers || ch.followerCount) {
                        followers = Number(ch.followers || ch.followerCount);
                    }
                    if (ch.videos || ch.videoCount) {
                        posts = Number(ch.videos || ch.videoCount);
                    }

                    // Debug only if something is weird
                    // console.log(`🔍 Extracted TikTok: ${username} | Subs: ${followers} | Vids: ${posts}`);
                }

                if (authorDetails) {
                    username = String(authorDetails.uniqueId || authorDetails.name || authorDetails.nickName || '');

                    // Stats might be nested in 'stats' object or flat
                    const stats = (item.stats || authorDetails.stats || authorDetails) as any;
                    followers = Number(stats.followerCount || stats.followers || stats.fans || 0);
                    posts = Number(stats.videoCount || stats.heart || 0);
                }

                // Fallback for debugging
                if (!username) {
                    console.log(`⚠️ Unrecognized TikTok item structure. Keys: ${Object.keys(item).join(', ')}`);
                }
                break;

            case 'youtube':
                // Check if it's an error object
                if (item.error || (item.url && item.note && !item.channelName)) {
                    console.log(`⚠️ YouTube Result is an error/empty object:`, JSON.stringify(item));
                    return null;
                }

                // streamers/youtube-channel-scraper
                // Tentar encontrar o handle ou customUrl
                const ytHandle = item.customUrl || item.channelHandle || '';
                if (typeof ytHandle === 'string' && ytHandle.includes('@')) {
                    username = ytHandle.replace('@', '');
                } else {
                    username = String(item.channelName || item.title || '');
                }
                followers = Number(item.subscriberCount || item.subscribers || item.numberOfSubscribers || 0);
                posts = Number(item.videoCount || item.numberOfVideos || 0);
                break;

            case 'x':
                // Check for error object
                if (item.error || item.noResults) {
                    console.log(`⚠️ X (Twitter) Result is an error object:`, JSON.stringify(item));
                    return null;
                }

                // apidojo/twitter-user-scraper output format
                username = String(item.userName || item.screen_name || item.handle || (item.legacy ? (item.legacy as any).screen_name : '') || '');
                followers = Number(item.followers || item.followersCount || (item.legacy ? (item.legacy as any).followers_count : 0) || 0);
                posts = Number(item.statusesCount || item.tweetsCount || (item.legacy ? (item.legacy as any).statuses_count : 0) || 0);
                break;

            default:
                return null;
        }

        if (!username) {
            console.log(`⚠️ Could not extract username from ${platform} result. Keys: ${Object.keys(item).join(', ')}`);
            return null;
        }

        // Remover @ se houver (comum em TikTok/YouTube)
        username = username.replace(/^@/, '');

        // FILTRO: Verificar se o username está na lista de perfis solicitados
        const requestedUsernames = profiles.map(p => p.username.toLowerCase());
        if (!requestedUsernames.includes(username.toLowerCase())) {
            console.log(`🚫 Filtering out unrequested profile: ${platform}/${username}`);
            return null;
        }

        return {
            platform,
            username,
            date,
            followers_count: followers || null,
            posts_count: posts || null,
            sync_status: 'ok',
            error_code: null,
            error_message: null,
            attempt: 1,
            runId,
            sourceActorId: platform,
        };

    } catch (error) {
        console.error(`Error normalizing ${platform} result:`, error);
        return null;
    }
}

// ============ KWAI CUSTOM SCRAPER ============

async function scrapeKwaiProfiles(profiles: ProfileInput[], date: string): Promise<MetricResult[]> {
    const kwaiResults: MetricResult[] = [];

    const crawler = new PuppeteerCrawler({
        maxConcurrency: 5,
        navigationTimeoutSecs: 30,
        requestHandlerTimeoutSecs: 60,
        maxRequestRetries: 2,

        launchContext: {
            launchOptions: <any>{
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--single-process',
                ],
            },
        },

        preNavigationHooks: [
            async ({ page }) => {
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    const resourceType = req.resourceType();
                    if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                );
                await page.setViewport({ width: 1920, height: 1080 });
            },
        ],

        async requestHandler({ page, request, log }) {
            const username = request.userData.username as string;
            log.info(`Scraping Kwai profile: ${username}`);

            try {
                await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => { });

                const pageContent = await page.content();

                // Tentar extrair followers de diferentes padrões
                let followers: number | null = null;
                let posts: number | null = null;

                // Padrão 1: JSON data no HTML
                const jsonMatch = pageContent.match(/"fans?[Cc]ount"\s*:\s*(\d+)/);
                if (jsonMatch) {
                    followers = parseInt(jsonMatch[1]);
                }

                // Padrão 2: Texto visível (ex: "1.5M fãs")
                if (!followers) {
                    const textMatch = pageContent.match(/(\d+(?:[.,]\d+)?[KMB]?)\s*(?:fãs|fans|seguidores|followers)/i);
                    if (textMatch) {
                        followers = parseKwaiCount(textMatch[1]);
                    }
                }

                // Tentar extrair posts/vídeos
                const videosMatch = pageContent.match(/"video[Cc]ount"\s*:\s*(\d+)/) ||
                    pageContent.match(/(\d+)\s*(?:vídeos?|videos?)/i);
                if (videosMatch) {
                    posts = parseInt(videosMatch[1]);
                }

                const res: MetricResult = {
                    platform: 'kwai',
                    username,
                    date,
                    followers_count: followers,
                    posts_count: posts,
                    sync_status: followers ? 'ok' : 'error',
                    error_code: followers ? null : 'parse_error',
                    error_message: followers ? null : 'Could not extract followers from Kwai page',
                    attempt: 1,
                    runId,
                    sourceActorId: 'custom-kwai',
                };

                kwaiResults.push(res);
                // Push immediately, but use our helper if accessible, or direct Actor.pushData if scope is tricky.
                // Since scope is tricky here due to kwaiResults being separated, we'll manually push.
                // Or better, let's keep consistency.
                // NOTE: pushResult is in main function scope. This scraping function is outside.
                // We should NOT use pushResult here as it's not defined. 
                // We will push manually here.
                Actor.pushData(res).catch(console.error);

                log.info(`✅ Kwai ${username}: ${followers} followers, ${posts} posts`);

            } catch (error) {
                log.error(`❌ Kwai ${username} failed: ${error}`);
                const res: MetricResult = {
                    platform: 'kwai',
                    username,
                    date,
                    followers_count: null,
                    posts_count: null,
                    sync_status: 'error',
                    error_code: errorCodeFromError(error),
                    error_message: error instanceof Error ? error.message : String(error),
                    attempt: 1,
                    runId,
                    sourceActorId: 'custom-kwai',
                };
                kwaiResults.push(res);
                Actor.pushData(res).catch(console.error);
            }

            await page.close();
        },

        failedRequestHandler({ request, log }, error) {
            const username = request.userData.username as string;
            log.error(`💀 Kwai ${username} failed after retries`);

            const res: MetricResult = {
                platform: 'kwai',
                username,
                date,
                followers_count: null,
                posts_count: null,
                sync_status: 'error',
                error_code: errorCodeFromError(error),
                error_message: error instanceof Error ? error.message : String(error),
                attempt: 1,
                runId,
                sourceActorId: 'custom-kwai',
            };
            kwaiResults.push(res);
            Actor.pushData(res).catch(console.error);
        },
    });

    // Criar requests para cada perfil
    const requests = profiles.map(profile => ({
        url: profile.url || `https://www.kwai.com/@${profile.username}`,
        userData: { username: profile.username },
    }));

    await crawler.run(requests);

    return kwaiResults;
}

function parseKwaiCount(text: string): number | null {
    if (!text) return null;

    const cleanText = text.replace(/[^0-9.,KMB]/gi, '').trim();
    let num = parseFloat(cleanText.replace(',', '.'));

    if (cleanText.toUpperCase().includes('K')) num *= 1000;
    if (cleanText.toUpperCase().includes('M')) num *= 1000000;
    if (cleanText.toUpperCase().includes('B')) num *= 1000000000;

    return Math.round(num) || null;
}

// ============ YOUTUBE CUSTOM SCRAPER ============

async function scrapeYoutubeProfiles(profiles: ProfileInput[], date: string): Promise<MetricResult[]> {
    const youtubeResults: MetricResult[] = [];

    const crawler = new PuppeteerCrawler({
        maxConcurrency: 5,
        navigationTimeoutSecs: 120,
        requestHandlerTimeoutSecs: 180,
        maxRequestRetries: 2,

        launchContext: {
            launchOptions: <any>{
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--single-process',
                ],
            },
        },

        preNavigationHooks: [
            async ({ page }) => {
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    const resourceType = req.resourceType();
                    if (['image', 'font', 'media'].includes(resourceType)) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                );
                await page.setViewport({ width: 1920, height: 1080 });
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'en-US,en;q=0.9',
                });
            },
        ],

        async requestHandler({ page, request, log }) {
            const username = request.userData.username as string;
            log.info(`Scraping YouTube profile: ${username}`);

            try {
                // Wait for network idle
                await page.waitForNetworkIdle({ timeout: 15000 }).catch(() => { });

                let followers: number | null = null;
                let posts: number | null = null;

                try {
                    // Method 1: ytInitialData
                    const initialData = await page.evaluate(() => {
                        // @ts-ignore
                        return window.ytInitialData;
                    });

                    if (initialData) {
                        const strData = JSON.stringify(initialData);

                        // Regex for subscribers from the data blob
                        const subMatch = strData.match(/"subscriberCountText":\s*{[^}]*"simpleText":\s*"([^"]+)"/);
                        if (subMatch) {
                            followers = parseYoutubeCount(subMatch[1]);
                        } else {
                            const simpleSubMatch = strData.match(/(\d+(?:\.\d+)?[KMB]?)\s+subscribers/i);
                            if (simpleSubMatch) {
                                followers = parseYoutubeCount(simpleSubMatch[1]);
                            }
                        }

                        // Regex for videos
                        const videoMatch = strData.match(/"videoCountText":\s*{[^}]*"simpleText":\s*"([^"]+)"/);
                        if (videoMatch) {
                            posts = parseYoutubeCount(videoMatch[1]);
                        } else {
                            const videoTextMatch = strData.match(/(\d+(?:\.\d+)?[KMB]?)\s+videos/i);
                            if (videoTextMatch) {
                                posts = parseYoutubeCount(videoTextMatch[1]);
                            }
                        }

                        // Method 1b: contentMetadataViewModel (New Layout 2024/2025)
                        if (followers === null || posts === null) {
                            try {
                                const header = (initialData as any)?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
                                if (header?.metadata?.contentMetadataViewModel?.metadataRows) {
                                    const rows = header.metadata.contentMetadataViewModel.metadataRows;
                                    for (const row of rows) {
                                        if (row.metadataParts) {
                                            for (const part of row.metadataParts) {
                                                const text = part?.text?.content;
                                                if (text) {
                                                    // Check for subscribers
                                                    if (followers === null && text.match(/subscribers|inscritos/i)) {
                                                        followers = parseYoutubeCount(text);
                                                    }
                                                    // Check for videos
                                                    if (posts === null && text.match(/videos|vídeos/i)) {
                                                        posts = parseYoutubeCount(text);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                log.warning(`Failed to parse pageHeaderViewModel: ${e}`);
                            }
                        }
                    }
                } catch (e) {
                    log.warning(`Failed to extract ytInitialData for ${username}: ${e}`);
                }

                // Method 2: DOM fallback
                if (followers === null) {
                    const content = await page.content();
                    const subTextMatch = content.match(/(\d+(?:\.\d+)?[KMB]?)\s+subscribers/i);
                    if (subTextMatch) {
                        followers = parseYoutubeCount(subTextMatch[1]);
                    }

                    const videoTextMatch = content.match(/(\d+(?:\.\d+)?[KMB]?)\s+videos/i);
                    if (videoTextMatch) {
                        posts = parseYoutubeCount(videoTextMatch[1]);
                    }
                }

                if (followers !== null) {
                    log.info(`✅ YouTube ${username}: ${followers} subs, ${posts} videos`);
                    const res: MetricResult = {
                        platform: 'youtube',
                        username,
                        date,
                        followers_count: followers,
                        posts_count: posts,
                        sync_status: 'ok',
                        error_code: null,
                        error_message: null,
                        attempt: 1,
                        runId,
                        sourceActorId: 'custom-youtube',
                    };
                    youtubeResults.push(res);
                    Actor.pushData(res).catch(console.error);
                } else {
                    log.warning(`⚠️ Could not find subscribers for YouTube: ${username}`);

                    // Log partial content for debugging
                    try {
                        const content = await page.content();
                        log.info(`DUMP ${username}: ` + content.substring(0, 1000));
                    } catch (e) {
                        log.error(`Failed to dump content: ${e}`);
                    }

                    const res: MetricResult = {
                        platform: 'youtube',
                        username,
                        date,
                        followers_count: null,
                        posts_count: null,
                        sync_status: 'error',
                        error_code: 'parse_error',
                        error_message: 'Could not extract subscribers',
                        attempt: 1,
                        runId,
                        sourceActorId: 'custom-youtube',
                    };
                    youtubeResults.push(res);
                    Actor.pushData(res).catch(console.error);
                }

            } catch (error) {
                log.error(`❌ YouTube ${username} failed: ${error}`);
                const res: MetricResult = {
                    platform: 'youtube',
                    username,
                    date,
                    followers_count: null,
                    posts_count: null,
                    sync_status: 'error',
                    error_code: errorCodeFromError(error),
                    error_message: error instanceof Error ? error.message : String(error),
                    attempt: 1,
                    runId,
                    sourceActorId: 'custom-youtube',
                };
                youtubeResults.push(res);
                Actor.pushData(res).catch(console.error);
            }
        },

        failedRequestHandler({ request, log }, error) {
            const username = request.userData.username as string;
            log.error(`💀 YouTube ${username} failed after retries`);
            const res: MetricResult = {
                platform: 'youtube',
                username,
                date,
                followers_count: null,
                posts_count: null,
                sync_status: 'error',
                error_code: errorCodeFromError(error),
                error_message: error instanceof Error ? error.message : String(error),
                attempt: 1,
                runId,
                sourceActorId: 'custom-youtube',
            };
            youtubeResults.push(res);
            Actor.pushData(res).catch(console.error);
        },
    });

    // Create requests
    const requests = profiles.map(profile => {
        let url = profile.url;
        if (!url) {
            const u = profile.username;
            if (u.startsWith('UC') && u.length === 24) {
                url = `https://www.youtube.com/channel/${u}`;
            } else {
                url = `https://www.youtube.com/@${u.replace(/^@/, '')}`;
            }
        }

        return {
            url,
            userData: { username: profile.username },
        };
    });

    await crawler.run(requests);

    return youtubeResults;
}

function parseYoutubeCount(text: string): number | null {
    if (!text) return null;
    const clean = text.replace(/subscribers|videos|[^0-9.KMB]/gi, '').trim();
    return parseKwaiCount(clean);
}

function errorCodeFromError(error: unknown): string {
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (msg.includes('timeout')) return 'timeout';
    if (msg.includes('not found') || msg.includes('404')) return 'not_found';
    if (msg.includes('captcha')) return 'captcha';
    if (msg.includes('rate') || msg.includes('429') || msg.includes('limit')) return 'rate_limit';
    if (msg.includes('blocked') || msg.includes('forbidden') || msg.includes('403')) return 'blocked';
    if (msg.includes('parse') || msg.includes('selector')) return 'parse_error';
    return 'error';
}
