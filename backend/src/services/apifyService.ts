import { SocialProfile } from "@prisma/client";

type MetricPoint = {
  date: Date;
  followersCount: number;
  postsCount: number;
};

type ApifyOutputItem = {
  profileId?: string;
  platform?: string;
  username?: string;
  date?: string;
  status?: "ok" | "error"; // legacy key
  sync_status?: "ok" | "error";
  errorMessage?: string | null; // legacy key
  error_message?: string | null;
  followers_count?: number | null;
  posts_count?: number | null;
  metrics?: { date: string; followers: number; posts: number }[];
};

const APIFY_BASE = "https://api.apify.com/v2";

export async function fetchProfilesBatch(profiles: SocialProfile[], days = 7): Promise<Map<number, MetricPoint[]>> {
  const actorId = process.env.APIFY_ACTOR_ID;
  const token = process.env.APIFY_TOKEN;

  if (!actorId || !token) {
    // Stub desabilitado: mantido para referência, mas comentado para evitar dados falsos em produção.
    // const map = new Map<number, MetricPoint[]>();
    // for (const profile of profiles) {
    //   map.set(profile.id, generateStubMetrics(profile.id, days));
    // }
    // return map;
    throw new Error("APIFY_ACTOR_ID ou APIFY_TOKEN ausente. Configurar integração antes de rodar coleta.");
  }

  const datasetItems = await runActorAndGetItems(actorId, token, profiles, days);
  const map = new Map<number, MetricPoint[]>();

  datasetItems.forEach((item) => {
    const status = item.status ?? item.sync_status ?? "ok";
    if (status === "error") return;

    if (!item.platform || !item.username) return;
    const normalizedUsername = item.username.replace(/^@/, "").toLowerCase();
    const profile = profiles.find(
      (p) =>
        p.platform === item.platform &&
        (p.handle.replace(/^@/, "").toLowerCase() === normalizedUsername || (p.externalId ?? "").toLowerCase() === normalizedUsername),
    );
    if (!profile) return;

    const metricsFromActor: MetricPoint[] = [];
    if (item.metrics && item.metrics.length > 0) {
      item.metrics.forEach((m) => {
        metricsFromActor.push({
          date: new Date(m.date),
          followersCount: m.followers,
          postsCount: m.posts,
        });
      });
    } else if (item.followers_count !== undefined || item.posts_count !== undefined) {
      metricsFromActor.push({
        date: item.date ? new Date(item.date) : new Date(),
        followersCount: item.followers_count ?? 0,
        postsCount: item.posts_count ?? 0,
      });
    }

    if (metricsFromActor.length === 0) return;

    map.set(profile.id, metricsFromActor);
  });

  return map;
}

async function runActorAndGetItems(actorId: string, token: string, profiles: SocialProfile[], _days: number) {
  const normalizedActorId = actorId.includes("~") ? actorId : actorId.replace(/\//g, "~");
  const input = {
    profiles: profiles.map((p) => ({
      platform: p.platform,
      username: (p.handle || "").replace(/^@/, ""),
      url: p.url,
    })),
  };

  const startRes = await fetch(
    `${APIFY_BASE}/acts/${normalizedActorId}/runs?token=${token}&waitForFinish=0&memory=2048&timeout=600`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`Apify run failed: ${startRes.status} ${text}`);
  }

  const startJson = (await startRes.json()) as any;
  let runData = startJson?.data;
  const runId = runData?.id;
  let datasetId = runData?.defaultDatasetId;
  let status = runData?.status;

  // Poll run status until it finishes or timeout (max ~10 minutes)
  const deadline = Date.now() + 600_000;
  while (status && !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const runRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    if (runRes.ok) {
      const runJson = (await runRes.json()) as any;
      runData = runJson?.data ?? runData;
      status = runData?.status ?? status;
      datasetId = runData?.defaultDatasetId ?? datasetId;
    } else {
      break;
    }
  }

  if (!datasetId) {
    throw new Error("Apify run missing datasetId");
  }
  if (status && status !== "SUCCEEDED") {
    throw new Error(`Apify run did not complete (status: ${status})`);
  }

  const itemsRes = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?clean=true&token=${token}`);
  if (!itemsRes.ok) {
    const text = await itemsRes.text();
    throw new Error(`Failed to fetch dataset items: ${itemsRes.status} ${text}`);
  }

  const data = await itemsRes.json();
  return Array.isArray(data) ? (data as ApifyOutputItem[]) : [];
}
