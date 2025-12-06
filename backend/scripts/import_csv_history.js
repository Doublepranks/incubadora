/**
 * Importa histórico manual do CSV visual para MetricDaily.
 * Mantém influencers/profiles existentes, cria se não existir.
 * City/State podem ficar vazios se não vierem no CSV.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient, Platform } = require("@prisma/client");

const prisma = new PrismaClient();
const CSV_PATH = process.env.CSV_PATH || path.join(__dirname, "../data.csv");

const platformMap = {
  insta: Platform.instagram,
  instagram: Platform.instagram,
  tiktok: Platform.tiktok,
  "tik tok": Platform.tiktok,
  x: Platform.x,
  twitter: Platform.x,
  youtube: Platform.youtube,
  ytb: Platform.youtube,
  kwai: Platform.kwai,
  kawai: Platform.kwai,
};

function parseNumber(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\./g, "").replace(/\s/g, "").replace(",", ".").replace("%", "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseDate(d) {
  if (!d) return null;
  const parts = d.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yy] = parts.map((p) => p.trim());
  const year = Number(yy) + 2000;
  const month = Number(mm) - 1;
  const day = Number(dd);
  const date = new Date(Date.UTC(year, month, day));
  return isNaN(date.getTime()) ? null : date;
}

function normalizePlatform(label) {
  if (!label) return null;
  const key = label.toString().trim().toLowerCase();
  return platformMap[key] || null;
}

function extractUsername(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("instagram")) {
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[0];
    }
    if (u.hostname.includes("tiktok")) {
      const parts = u.pathname.split("/").filter(Boolean);
      return (parts[0] || "").replace("@", "");
    }
    if (u.hostname.includes("youtube")) {
      const parts = u.pathname.split("/").filter(Boolean);
      return (parts[0] || "").replace("@", "");
    }
    if (u.hostname === "x.com" || u.hostname.includes("twitter")) {
      const parts = u.pathname.split("/").filter(Boolean);
      return (parts[0] || "").replace("@", "");
    }
    if (u.hostname.includes("kwai")) {
      const parts = u.pathname.split("/").filter(Boolean);
      return (parts.pop() || "").replace("@", "");
    }
    return u.pathname.replace(/\//g, "") || null;
  } catch {
    return null;
  }
}

function splitCityState(text) {
  if (!text) return { city: "", state: "" };
  const parts = text.split("-");
  if (parts.length >= 2) {
    return { city: parts[0].trim(), state: parts[1].trim().toUpperCase() };
  }
  return { city: text.trim(), state: "" };
}

function parseCsvRaw(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = content.split(/\r?\n/).map((line) => line.split(","));
  return rows;
}

function extractBlocks(rows) {
  const blocks = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i].map((c) => c.trim());
    if (row[0]?.toLowerCase() === "porta voz") {
      const name = row[1] || "";
      const cityStateRaw = row[2] || "";
      const { city, state } = splitCityState(cityStateRaw);

      // header with dates is the next line after "Porta Voz"
      const header = rows[i + 1]?.map((c) => c.trim()) || [];
      const dateCols = header.slice(1, 7).filter(Boolean);

      const entries = [];
      let j = i + 2;
      while (j < rows.length) {
        const r = rows[j].map((c) => c.trim());
        if (!r[0] || r[0].toLowerCase() === "total" || r.every((c) => !c)) break;
        entries.push(r);
        j++;
      }

      blocks.push({ name, city, state, dateCols, entries });
      i = j;
    } else {
      i++;
    }
  }
  return blocks;
}

async function upsertInfluencer(name, city, state) {
  const existing = await prisma.influencer.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.influencer.create({
    data: {
      name,
      city,
      state,
    },
  });
}

async function upsertProfile(influencerId, platform, handle, url) {
  const existing = await prisma.socialProfile.findFirst({
    where: { influencerId, platform, handle },
  });
  if (existing) return existing;
  return prisma.socialProfile.create({
    data: {
      influencerId,
      platform,
      handle,
      url,
      externalId: handle,
    },
  });
}

async function run() {
  console.log("Lendo CSV:", CSV_PATH);
  const rows = parseCsvRaw(CSV_PATH);
  const blocks = extractBlocks(rows);
  let metricsCount = 0;
  for (const block of blocks) {
    if (!block.name) continue;
    const influencer = await upsertInfluencer(block.name, block.city, block.state);
    for (const entry of block.entries) {
      const platform = normalizePlatform(entry[0]);
      if (!platform) continue;
      const url = entry[13] || "";
      const username = extractUsername(url) || entry[0];
      const handle = username.startsWith("@") ? username : `@${username}`;
      const profile = await upsertProfile(influencer.id, platform, handle, url);

      // date columns start at index 1..6 (24/11/25 etc.)
      for (let idx = 0; idx < block.dateCols.length; idx++) {
        const dateLabel = block.dateCols[idx];
        const dateVal = parseDate(dateLabel);
        if (!dateVal) continue;
        const followersRaw = entry[1 + idx];
        const followersCount = parseNumber(followersRaw);
        if (followersCount == null) continue;
        await prisma.metricDaily.upsert({
          where: {
            socialProfileId_date: {
              socialProfileId: profile.id,
              date: dateVal,
            },
          },
          update: {
            followersCount,
            postsCount: 0,
          },
          create: {
            socialProfileId: profile.id,
            date: dateVal,
            followersCount,
            postsCount: 0,
          },
        });
        metricsCount++;
      }
    }
  }
  console.log(`Import concluído. Métricas inseridas/atualizadas: ${metricsCount}`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
