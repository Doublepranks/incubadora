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
  tiktok: "apify/tiktok-scraper",
  youtube: "apify/youtube-scraper",
  x: "apify/twitter-scraper",
  kwai: null,
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
    const call = await Actor.call(actorId, { handle: profile.username, username: profile.username, url: profile.url }, {
      timeoutSecs: perRequestTimeoutSecs,
    });

    const datasetId = call?.defaultDatasetId;
    let followers = null;
    let posts = null;

    if (datasetId) {
      const items = await Actor.openDataset(datasetId);
      const list = await items.getData({ limit: 1 });
      const first = list.items[0];
      if (first) {
        followers = first.followers ?? first.followersCount ?? first.followers_count ?? null;
        posts = first.posts ?? first.postsCount ?? first.posts_count ?? null;
      }
    }

    await Actor.pushData(<NormalizedResult>{
      platform: profile.platform,
      username: profile.username,
      url: profile.url ?? null,
      date,
      followers_count: followers,
      posts_count: posts,
      sync_status: "ok",
      error_code: null,
      error_message: null,
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
