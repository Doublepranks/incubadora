import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/services/authService";
import { Platform } from "@prisma/client";

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.warn("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to seed an admin user. Skipping admin seed.");
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "admin_global",
    },
    create: {
      email,
      name,
      passwordHash,
      role: "admin_global",
    },
  });

  console.log(`Seeded/updated admin user with email: ${email}`);
}

async function seedRegional() {
  const email = process.env.SEED_REGIONAL_EMAIL || "admin.regional@local";
  const password = process.env.SEED_REGIONAL_PASSWORD || "changeme123";
  const name = process.env.SEED_REGIONAL_NAME || "Admin Regional";
  const regions = (process.env.SEED_REGIONAL_UF || "PE,RN")
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "admin_regional" },
    create: { email, name, passwordHash, role: "admin_regional" },
  });

  await prisma.userRegion.deleteMany({ where: { userId: user.id } });
  if (regions.length > 0) {
    await prisma.userRegion.createMany({
      data: regions.map((uf) => ({ userId: user.id, uf })),
      skipDuplicates: true,
    });
  }

  console.log(`Seeded/updated regional admin: ${email} with UFs: ${regions.join(",") || "none"}`);
}

type ProfileSeed = {
  platform: Platform;
  handle: string;
  url: string;
  startFollowers: number;
};

function generateMetrics(startFollowers: number, days: number) {
  const metrics = [];
  let current = startFollowers;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const growth = Math.floor(Math.random() * 80) + 20; // 20-99 growth/day
    const posts = Math.floor(Math.random() * 3); // 0-2 posts/day
    current += growth;
    metrics.push({
      date,
      followersCount: current,
      postsCount: posts,
    });
  }
  return metrics;
}

async function seedInfluencer(name: string, state: string, city: string, avatarUrl: string, profiles: ProfileSeed[]) {
  const influencer = await prisma.influencer.create({
    data: {
      name,
      state,
      city,
      avatarUrl,
    },
  });

  for (const profile of profiles) {
    const social = await prisma.socialProfile.create({
      data: {
        influencerId: influencer.id,
        platform: profile.platform,
        handle: profile.handle,
        url: profile.url,
        externalId: profile.handle,
      },
    });

    const metrics = generateMetrics(profile.startFollowers, 60);
    for (const metric of metrics) {
      await prisma.metricDaily.create({
        data: {
          socialProfileId: social.id,
          date: metric.date,
          followersCount: metric.followersCount,
          postsCount: metric.postsCount,
        },
      });
    }
  }

  console.log(`Seeded influencer: ${name}`);
}

async function seedData() {
  await seedAdmin();
  await seedRegional();

  const influencers = await prisma.influencer.count();
  if (influencers > 0) {
    console.log("Influencers already exist, skipping influencer seed.");
    return;
  }

  await seedInfluencer("Carlos Silva", "SP", "São Paulo", "https://i.pravatar.cc/150?img=1", [
    { platform: Platform.instagram, handle: "@carlos.silva", url: "https://instagram.com/carlos.silva", startFollowers: 120000 },
    { platform: Platform.x, handle: "@carlossilva", url: "https://x.com/carlossilva", startFollowers: 45000 },
    { platform: Platform.youtube, handle: "CarlosSilvaTV", url: "https://youtube.com/carlossilva", startFollowers: 80000 },
  ]);

  await seedInfluencer("Amanda Souza", "RJ", "Rio de Janeiro", "https://i.pravatar.cc/150?img=2", [
    { platform: Platform.instagram, handle: "@amanda.souza", url: "https://instagram.com/amanda.souza", startFollowers: 290000 },
    { platform: Platform.kwai, handle: "@amandasouza", url: "https://kwai.com/amandasouza", startFollowers: 480000 },
  ]);

  await seedInfluencer("Roberto Mendes", "MG", "Belo Horizonte", "https://i.pravatar.cc/150?img=3", [
    { platform: Platform.instagram, handle: "@roberto.mendes", url: "https://instagram.com/roberto.mendes", startFollowers: 49500 },
    { platform: Platform.x, handle: "@betomendes", url: "https://x.com/betomendes", startFollowers: 11800 },
  ]);
}

seedData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
