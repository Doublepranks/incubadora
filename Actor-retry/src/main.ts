import { Actor } from "apify";

type Platform = "instagram" | "tiktok" | "youtube" | "x" | "kwai";

type ProfileInput = {
  platform: Platform;
  username: string;
  url?: string | null;
  attempt?: number;
  error_code?: string | null;
  error_message?: string | null;
};

type ActorIds = Partial<Record<Platform | "generic", string | null>>;

type InputSchema = {
  profiles: ProfileInput[];
  actorIds?: ActorIds;
  perRequestTimeoutSecs?: number;
  maxConcurrency?: number;
  backoffMs?: number;
};

type NormalizedResult = {
  platform: Platform;
  username: string;
  url?: string | null;
  date: string;
  followers_count: number | null;
  posts_count: number | null;
  sync_status: "ok" | "error";
  error_code: string | null;
  error_message: string | null;
  attempt: number;
  runId: string;
  sourceActorId: string | null;
};

await Actor.init();

const input = await Actor.getInput<InputSchema>();
if (!input?.profiles || input.profiles.length === 0) {
  throw new Error("Input must include profiles array");
}

const actorIds: ActorIds = {
  instagram: "apify/instagram-scraper",
  tiktok: "clockworks/tiktok-profile-scraper",
  youtube: "apidojo/youtube-scraper",
  x: "apidojo/twitter-user-scraper",
  kwai: "luan.r.dev/kwai-profile-scraper",
  generic: null,
  ...(input.actorIds || {}),
};

const maxConcurrency = input.maxConcurrency ?? 2;
const backoffMs = input.backoffMs ?? 2000;
const perRequestTimeoutSecs = input.perRequestTimeoutSecs ?? 120;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processProfile(profile: ProfileInput): Promise<void> {
  const actorId =
    actorIds[profile.platform] ||
    actorIds.generic ||
    null;

  const attempt = profile.attempt ?? 2;
  const runId = Actor.getEnv().actorRunId ?? "local-run";
  const date = new Date().toISOString().split("T")[0];

  if (!actorId) {
    await Actor.pushData(<NormalizedResult>{
      platform: profile.platform,
      username: profile.username,
      url: profile.url ?? null,
      date,
      followers_count: null,
      posts_count: null,
      sync_status: "error",
      error_code: "no_actor",
      error_message: "Nenhum actor definido para esta plataforma",
      attempt,
      runId,
      sourceActorId: null,
    });
    return;
  }

  try {
    // Monta input específico por plataforma (ex.: YouTube aceita startUrls; Kwai aceita urls)
    const actorInput = buildActorInput(profile);

    const call = await Actor.call(actorId, actorInput, {
      timeoutSecs: perRequestTimeoutSecs,
    } as any);

    const datasetId = call?.defaultDatasetId;
    let followers = null;
    let posts = null;

    if (datasetId) {
      const items = await Actor.openDataset(datasetId);
      const list = await items.getData({ limit: 1 });
      const first = list.items[0];
      if (first) {
        const norm = normalizeResult(profile.platform, first as any, profile.username);
        followers = norm.followers;
        posts = norm.posts;
      }
    }

    await Actor.pushData(<NormalizedResult>{
      platform: profile.platform,
      username: profile.username,
      url: profile.url ?? null,
      date,
      followers_count: followers,
      posts_count: posts,
      sync_status: followers === null ? "error" : "ok",
      error_code: followers === null ? "parse_error" : null,
      error_message: followers === null ? "Não foi possível normalizar a saída do actor" : null,
      attempt,
      runId,
      sourceActorId: actorId,
    });
  } catch (err: any) {
    await Actor.pushData(<NormalizedResult>{
      platform: profile.platform,
      username: profile.username,
      url: profile.url ?? null,
      date,
      followers_count: null,
      posts_count: null,
      sync_status: "error",
      error_code: err?.name || "error",
      error_message: err?.message || String(err),
      attempt,
      runId,
      sourceActorId: actorId,
    });
  }
}

const queue = [...input.profiles];
const workers: Promise<void>[] = [];

for (let i = 0; i < Math.min(maxConcurrency, queue.length); i++) {
  workers.push(
    (async function worker() {
      while (queue.length > 0) {
        const profile = queue.shift();
        if (!profile) break;
        await processProfile(profile);
        if (backoffMs > 0) {
          await sleep(backoffMs);
        }
      }
    })()
  );
}

await Promise.all(workers);
await Actor.exit();

function buildActorInput(profile: ProfileInput) {
  const handle = profile.username?.replace(/^@/, "");
  switch (profile.platform) {
    case "instagram":
      return { usernames: [handle] };
    case "tiktok":
      return { handles: [handle] };
    case "youtube":
      // apidojo/youtube-scraper aceita startUrls ou canais; vamos usar url se vier, senão handle @
      return { startUrls: [profile.url || `https://www.youtube.com/@${handle}`], maxItems: 1 };
    case "x":
      return { twitterHandles: [handle], tweetsDesired: 0, followersDesired: 0, followingDesired: 0, includeUserInfo: true };
    case "kwai":
      return { urls: [profile.url || `https://www.kwai.com/@${handle}`] };
    default:
      return { usernames: [handle] };
  }
}

function normalizeResult(platform: Platform, item: any, requestedUsername: string) {
  const handle = requestedUsername.replace(/^@/, "");
  let followers = null;
  let posts = null;
  let matchedHandle = true;

  switch (platform) {
    case "instagram":
      followers = item.followers ?? item.followersCount ?? item.followers_count ?? null;
      posts = item.posts ?? item.postsCount ?? item.posts_count ?? null;
      break;
    case "tiktok":
      if (item.authorStats) {
        followers = item.authorStats.followerCount ?? item.authorStats.followers ?? null;
        posts = item.authorStats.videoCount ?? item.authorStats.videos ?? null;
      } else if (item.stats) {
        followers = item.stats.followerCount ?? item.stats.followers ?? null;
        posts = item.stats.videoCount ?? item.stats.videos ?? null;
      } else {
        followers = item.followers ?? item.followersCount ?? null;
        posts = item.videos ?? item.videoCount ?? null;
      }
      break;
    case "youtube":
      // apidojo/youtube-scraper pode retornar vídeo ou canal; procuramos channel/subscriber
      if (item.channel) {
        followers = item.channel.subscriberCount ?? item.channel.subscribers ?? item.channel.followers ?? null;
        posts = item.channel.videoCount ?? item.channel.videos ?? null;

        // Checar match do handle via URL ou id do canal
        const channelUrl: string | undefined = item.channel.url;
        const channelId: string | undefined = item.channel.id;
        const channelName: string | undefined = item.channel.name;
        matchedHandle = Boolean(
          !handle ||
          (channelUrl && channelUrl.toLowerCase().includes(`/@${handle.toLowerCase()}`)) ||
          (channelId && channelId.toLowerCase() === handle.toLowerCase()) ||
          (channelName && channelName.toLowerCase() === handle.toLowerCase())
        );
      } else {
        followers = item.subscriberCount ?? item.subscribers ?? item.numberOfSubscribers ?? null;
        posts = item.videoCount ?? item.numberOfVideos ?? item.videos ?? null;

        const channelUrl: string | undefined = item.url || item.channelUrl;
        matchedHandle = Boolean(
          !handle ||
          (channelUrl && channelUrl.toLowerCase().includes(`/@${handle.toLowerCase()}`)) ||
          (item.channelId && String(item.channelId).toLowerCase() === handle.toLowerCase())
        );
      }
      break;
    case "x":
      followers = item.followers ?? item.followersCount ?? (item.legacy ? item.legacy.followers_count : null);
      posts = item.statusesCount ?? item.tweetsCount ?? (item.legacy ? item.legacy.statuses_count : null);
      break;
    case "kwai":
      followers = item.fans ?? item.followers ?? item.followersCount ?? item.followers_count ?? null;
      posts = item.videoCount ?? item.videos ?? item.video_count ?? null;
      break;
    default:
      followers = item.followers ?? item.followersCount ?? null;
      posts = item.posts ?? item.postsCount ?? null;
  }

  // se não bater o handle (quando conseguimos verificar), devolve null para forçar erro parse_error
  if (!matchedHandle) {
    return { followers: null, posts: null };
  }

  return { followers, posts };
}
