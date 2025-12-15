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
    instagram: 'apify/instagram-scraper',
    tiktok: 'clockworks/tiktok-profile-scraper',
    youtube: 'apidojo/youtube-scraper',
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

const date = getTodayInSaoPaulo();
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

    // YouTube agora usa actor externo apidojo/youtube-scraper (removido scraping interno)

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
                error_code: 'no_actor',
                error_message: `No actor configured for platform: ${platform}`,
                attempt: 1,
                runId,
                sourceActorId: null,
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
                        error_code: 'not_found',
                        error_message: 'Profile not found or no valid data returned',
                        attempt: 1,
                        runId,
                        sourceActorId: actorId,
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
                    error_code: errorCodeFromError(error),
                    error_message: error instanceof Error ? error.message : String(error),
                    attempt: 1,
                    runId,
                    sourceActorId: actorId,
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
            results.push({
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

// Salvar todos os resultados
for (const result of results) {
    await Actor.pushData(result);
}

console.log(`\n📊 Summary:`);
console.log(`   Total results: ${results.length}`);
console.log(`   ✅ Success: ${results.filter(r => r.sync_status === 'ok').length}`);
console.log(`   ❌ Failed: ${results.filter(r => r.sync_status === 'error').length}`);

await Actor.exit();

function getTodayInSaoPaulo(): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return formatter.format(new Date()); // YYYY-MM-DD
}

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
            // clockworks/tiktok-profile-scraper expects profiles array
            return {
                profiles: usernames,
            };

        case 'youtube':
            // apidojo/youtube-scraper expects startUrls
            return {
                startUrls: profiles.map(p => ({
                    url: p.url || `https://www.youtube.com/@${p.username.replace(/^@/, '')}`
                })),
                maxItems: profiles.length,
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
                // clockworks/tiktok-profile-scraper result normalization
                // Pode retornar dados de vídeo com authorMeta, ou dados diretos de perfil

                if (item.noResults || item.error) {
                    return null;
                }

                // Caso 1: authorMeta presente (formato de vídeo do clockworks)
                if (item.authorMeta) {
                    const author = item.authorMeta as any;
                    username = String(author.name || author.uniqueId || author.id || '');
                    followers = Number(author.fans || author.followers || author.followerCount || 0);
                    posts = Number(author.video || author.videos || author.videoCount || 0);
                }
                // Caso 2: formato direto de perfil
                else {
                    username = String(item.username || item.uniqueId || item.name || '');
                    followers = Number(item.followers || item.fans || item.followerCount || 0);
                    posts = Number(item.videos || item.videoCount || 0);

                    // Fallback para stats aninhado
                    if (!followers && item.stats) {
                        const stats = item.stats as any;
                        followers = Number(stats.followerCount || stats.followers || stats.fans || 0);
                        posts = Number(stats.videoCount || stats.videos || 0);
                    }
                }
                break;

            case 'youtube':
                // apidojo/youtube-scraper result normalization
                // Pode retornar video ou channel info

                if (item.error || item.noResults) {
                    console.log(`⚠️ YouTube Result is an error/empty object:`, JSON.stringify(item));
                    return null;
                }

                // apidojo/youtube-scraper retorna channel info aninhado ou direto
                if (item.channel) {
                    const ch = item.channel as any;
                    username = String(ch.name || ch.id || '');
                    followers = Number(ch.subscriberCount || ch.subscribers || 0);
                    posts = Number(ch.videoCount || ch.videos || 0);
                } else {
                    // Formato direto
                    const ytHandle = item.customUrl || item.channelHandle || '';
                    if (typeof ytHandle === 'string' && ytHandle.includes('@')) {
                        username = ytHandle.replace('@', '');
                    } else {
                        username = String(item.channelName || item.title || item.name || '');
                    }
                    followers = Number(item.subscriberCount || item.subscribers || item.numberOfSubscribers || 0);
                    posts = Number(item.videoCount || item.numberOfVideos || 0);
                }
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

                // Padrão 1: JSON data no HTML (múltiplos formatos)
                const jsonPatterns = [
                    /"fans?[Cc]ount"\s*:\s*(\d+)/,
                    /"follower[Cc]ount"\s*:\s*(\d+)/,
                    /"fans"\s*:\s*(\d+)/,
                    /"followers"\s*:\s*(\d+)/,
                    /fanCount['"]\s*:\s*(\d+)/,
                ];
                for (const pattern of jsonPatterns) {
                    const match = pageContent.match(pattern);
                    if (match) {
                        followers = parseInt(match[1]);
                        break;
                    }
                }

                // Padrão 2: Texto visível (ex: "1.5M fãs", "500K fans")
                if (!followers) {
                    const textPatterns = [
                        /(\d+(?:[.,]\d+)?[KMB]?)\s*(?:fãs?|fans?|seguidores?|followers?)/i,
                        /(?:fãs?|fans?|seguidores?|followers?)\s*[:\s]*(\d+(?:[.,]\d+)?[KMB]?)/i,
                    ];
                    for (const pattern of textPatterns) {
                        const match = pageContent.match(pattern);
                        if (match) {
                            followers = parseKwaiCount(match[1]);
                            if (followers) break;
                        }
                    }
                }

                // Tentar extrair posts/vídeos - PRIORIZAR dados estruturados
                // O texto genérico pode capturar vídeos do feed, não do perfil
                const videoJsonPatterns = [
                    /"video[Cc]ount"\s*:\s*(\d+)/,
                    /"works"\s*:\s*(\d+)/,
                    /"photo[Cc]ount"\s*:\s*(\d+)/,  // Kwai também tem fotos
                    /"originalPhotoCount"\s*:\s*(\d+)/,
                ];
                for (const pattern of videoJsonPatterns) {
                    const match = pageContent.match(pattern);
                    if (match) {
                        posts = parseInt(match[1]);
                        log.info(`📊 Found video count via JSON: ${posts} (pattern: ${pattern})`);
                        break;
                    }
                }

                // DEBUG: Log o que encontramos nos dados estruturados
                const userDataMatch = pageContent.match(/"userData"\s*:\s*(\{[^}]+\})/);
                const profileMatch = pageContent.match(/"profile"\s*:\s*(\{[^}]+\})/);
                if (userDataMatch) {
                    log.info(`🔍 Found userData: ${userDataMatch[1].slice(0, 200)}...`);
                }
                if (profileMatch) {
                    log.info(`🔍 Found profile: ${profileMatch[1].slice(0, 200)}...`);
                }

                // REMOVIDO: fallback de texto para posts - captura vídeos do feed, não do usuário
                // Se não encontrou via JSON, assumir 0 posts (mais seguro para contas novas)

                // Verificar se a página parece ser um perfil válido (contém elementos de perfil)
                const isValidProfile = pageContent.includes('profile') ||
                    pageContent.includes('user') ||
                    pageContent.includes(username.toLowerCase());

                // Sucesso se encontrou dados OU se a página é um perfil válido (conta nova sem dados)
                const hasData = followers !== null || posts !== null || isValidProfile;

                kwaiResults.push({
                    platform: 'kwai',
                    username,
                    date,
                    followers_count: followers ?? 0,  // Tratar null como 0
                    posts_count: posts ?? 0,
                    sync_status: hasData ? 'ok' : 'error',
                    error_code: hasData ? null : 'parse_error',
                    error_message: hasData ? null : 'Could not extract any data from Kwai page',
                    attempt: 1,
                    runId,
                    sourceActorId: 'custom-kwai',
                });

                log.info(`✅ Kwai ${username}: ${followers ?? 0} followers, ${posts ?? 0} posts (valid profile: ${isValidProfile})`);

            } catch (error) {
                log.error(`❌ Kwai ${username} failed: ${error}`);
                kwaiResults.push({
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
                error_code: errorCodeFromError(error),
                error_message: error instanceof Error ? error.message : String(error),
                attempt: 1,
                runId,
                sourceActorId: 'custom-kwai',
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
