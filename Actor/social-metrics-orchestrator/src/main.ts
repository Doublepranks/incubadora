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
    error_message: string | null;
}

// IDs dos actors da Apify Store
const ACTOR_IDS: Record<string, string> = {
    instagram: 'apify/instagram-profile-scraper',
    tiktok: 'clockworks/tiktok-profile-scraper',
    x: 'apidojo/twitter-user-scraper',
};

await Actor.init();

const input = await Actor.getInput<ActorInput>();
if (!input?.profiles) {
    throw new Error('Input must contain profiles array');
}

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
for (const [platform, platformProfiles] of profilesByPlatform) {
    console.log(`\n📱 Processing ${platform}: ${platformProfiles.length} profiles`);

    if (platform === 'kwai') {
        // Kwai: usar scraping próprio com Puppeteer
        console.log('🔧 Using custom Puppeteer scraper for Kwai...');
        const kwaiResults = await scrapeKwaiProfiles(platformProfiles, date);
        results.push(...kwaiResults);
        continue;
    }

    if (platform === 'youtube') {
        // YouTube: usar scraping próprio com Puppeteer
        console.log('🔧 Using custom Puppeteer scraper for YouTube...');
        const youtubeResults = await scrapeYoutubeProfiles(platformProfiles, date);
        results.push(...youtubeResults);
        continue;
    }

    const actorId = ACTOR_IDS[platform];
    if (!actorId) {
        console.log(`⚠️ No actor configured for ${platform}`);
        // Registrar erro para cada perfil desta plataforma
        for (const profile of platformProfiles) {
            results.push({
                platform,
                username: profile.username,
                date,
                followers_count: null,
                posts_count: null,
                sync_status: 'error',
                error_message: `No actor configured for platform: ${platform}`,
            });
        }
        continue;
    }

    if (platform === 'x') {
        // Special handling for X - call individually to isolate failures/limits
        console.log(`🛡️ Isolating calls for ${platform} to prevent limit exhaustion/batch failures`);

        for (const profile of platformProfiles) {
            try {
                // Call actor for single profile
                const singleInput = buildActorInput(platform, [profile]);
                console.log(`🚀 Calling actor ${actorId} for ${profile.username}`);

                const run = await client.actor(actorId).call(singleInput, {
                    memory: 1024,
                    timeout: 180,
                });

                // Get results
                const { items } = await client.dataset(run.defaultDatasetId).listItems();
                console.log(`✅ ${profile.username}: Got ${items.length} items`);

                // Normalize result
                let found = false;
                for (const item of items) {
                    const normalized = normalizeResult(platform, item as Record<string, unknown>, [profile], date);
                    if (normalized) {
                        results.push(normalized);
                        found = true;
                    }
                }

                if (!found) {
                    console.log(`⚠️ Profile missing from results: ${platform}/${profile.username}`);
                    results.push({
                        platform,
                        username: profile.username,
                        date,
                        followers_count: null,
                        posts_count: null,
                        sync_status: 'error',
                        error_message: 'Profile not found or no valid data returned',
                    });
                }

            } catch (error) {
                console.error(`❌ Error with ${platform}/${profile.username}:`, error);
                results.push({
                    platform,
                    username: profile.username,
                    date,
                    followers_count: null,
                    posts_count: null,
                    sync_status: 'error',
                    error_message: error instanceof Error ? error.message : String(error),
                });
            }
        }
        continue;
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
                results.push(normalized);
            }
        }

        // Verificar se algum perfil não foi encontrado
        const foundUsernames = results
            .filter(r => r.platform === platform)
            .map(r => r.username.toLowerCase());

        for (const profile of platformProfiles) {
            if (!foundUsernames.includes(profile.username.toLowerCase())) {
                console.log(`⚠️ Profile missing from results: ${platform}/${profile.username}`);
                results.push({
                    platform,
                    username: profile.username,
                    date,
                    followers_count: null,
                    posts_count: null,
                    sync_status: 'error',
                    error_message: 'Profile not found in actor results',
                });
            }
        }

    } catch (error) {
        console.error(`❌ Error with ${platform}:`, error);

        // Marcar todos os perfis desta plataforma como erro
        for (const profile of platformProfiles) {
            results.push({
                platform,
                username: profile.username,
                date,
                followers_count: null,
                posts_count: null,
                sync_status: 'error',
                error_message: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

// Salvar todos os resultados
for (const result of results) {
    await Actor.pushData(result);
}

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
            // clockworks/tiktok-profile-scraper
            return {
                profiles: usernames.map(u => `https://www.tiktok.com/@${u}`),
                resultsPerPage: 1,  // Must be >= 1
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
                // clockworks/tiktok-profile-scraper (returns VIDEO objects when resultsPerPage > 0)
                // Try from authorMeta if available (video object)
                if (item.authorMeta && typeof item.authorMeta === 'object') {
                    const meta = item.authorMeta as any;
                    username = String(meta.uniqueId || meta.name || meta.nickName || '');
                } else {
                    // Try direct profile fields
                    username = String(item.uniqueId || item.username || '');
                }

                // If it's a video object, followerCount might be in authorMeta or not available directly
                // Ideally we want profile info, but if we get videos, we might only get stats for that video
                if (item.authorMeta && (item.authorMeta as any).fans) {
                    followers = Number((item.authorMeta as any).fans);
                } else {
                    followers = Number(item.followerCount || item.fans || 0);
                }

                posts = Number(item.videoCount || 0);
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
            error_message: null,
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
        maxConcurrency: 1,
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

                kwaiResults.push({
                    platform: 'kwai',
                    username,
                    date,
                    followers_count: followers,
                    posts_count: posts,
                    sync_status: followers ? 'ok' : 'error',
                    error_message: followers ? null : 'Could not extract followers from Kwai page',
                });

                log.info(`✅ Kwai ${username}: ${followers} followers, ${posts} posts`);

            } catch (error) {
                log.error(`❌ Kwai ${username} failed: ${error}`);
                kwaiResults.push({
                    platform: 'kwai',
                    username,
                    date,
                    followers_count: null,
                    posts_count: null,
                    sync_status: 'error',
                    error_message: error instanceof Error ? error.message : String(error),
                });
            }

            await page.close();
        },

        failedRequestHandler({ request, log }, error) {
            const username = request.userData.username as string;
            log.error(`💀 Kwai ${username} failed after retries`);

            kwaiResults.push({
                platform: 'kwai',
                username,
                date,
                followers_count: null,
                posts_count: null,
                sync_status: 'error',
                error_message: error instanceof Error ? error.message : String(error),
            });
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
        maxConcurrency: 1,
        navigationTimeoutSecs: 60,
        requestHandlerTimeoutSecs: 120,
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
                    youtubeResults.push({
                        platform: 'youtube',
                        username,
                        date,
                        followers_count: followers,
                        posts_count: posts,
                        sync_status: 'ok',
                        error_message: null,
                    });
                } else {
                    log.warning(`⚠️ Could not find subscribers for YouTube: ${username}`);
                    youtubeResults.push({
                        platform: 'youtube',
                        username,
                        date,
                        followers_count: null,
                        posts_count: null,
                        sync_status: 'error',
                        error_message: 'Could not extract subscribers',
                    });
                }

            } catch (error) {
                log.error(`❌ YouTube ${username} failed: ${error}`);
                youtubeResults.push({
                    platform: 'youtube',
                    username,
                    date,
                    followers_count: null,
                    posts_count: null,
                    sync_status: 'error',
                    error_message: error instanceof Error ? error.message : String(error),
                });
            }
        },

        failedRequestHandler({ request, log }, error) {
            const username = request.userData.username as string;
            log.error(`💀 YouTube ${username} failed after retries`);
            youtubeResults.push({
                platform: 'youtube',
                username,
                date,
                followers_count: null,
                posts_count: null,
                sync_status: 'error',
                error_message: error instanceof Error ? error.message : String(error),
            });
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
