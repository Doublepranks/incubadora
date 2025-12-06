/* Seed 5 demo influencers with synthetic metrics.
   Leaves existing influencers (e.g., Nadson, O Brasil de Cima) untouched. */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const demoInfluencers = [
  {
    name: "Ana Costa",
    state: "SP",
    city: "Sao Paulo",
    avatarUrl: "https://i.pravatar.cc/150?img=11",
    profiles: [
      { platform: "instagram", handle: "@anacosta", url: "https://instagram.com/anacosta", startFollowers: 52000 },
      { platform: "youtube", handle: "AnaCostaTV", url: "https://youtube.com/@AnaCostaTV", startFollowers: 31000 },
    ],
  },
  {
    name: "Bruno Lima",
    state: "RJ",
    city: "Rio de Janeiro",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    profiles: [
      { platform: "instagram", handle: "@brunolima", url: "https://instagram.com/brunolima", startFollowers: 78000 },
      { platform: "x", handle: "@brunolima", url: "https://x.com/brunolima", startFollowers: 42000 },
      { platform: "tiktok", handle: "@brunolima", url: "https://www.tiktok.com/@brunolima", startFollowers: 95000 },
    ],
  },
  {
    name: "Carla Mendes",
    state: "MG",
    city: "Belo Horizonte",
    avatarUrl: "https://i.pravatar.cc/150?img=13",
    profiles: [
      { platform: "instagram", handle: "@carlamendes", url: "https://instagram.com/carlamendes", startFollowers: 43000 },
      { platform: "x", handle: "@carlamendes", url: "https://x.com/carlamendes", startFollowers: 21000 },
      { platform: "youtube", handle: "CarlaMendes", url: "https://youtube.com/@CarlaMendes", startFollowers: 38000 },
    ],
  },
  {
    name: "Diego Rocha",
    state: "BA",
    city: "Salvador",
    avatarUrl: "https://i.pravatar.cc/150?img=14",
    profiles: [
      { platform: "instagram", handle: "@diegorocha", url: "https://instagram.com/diegorocha", startFollowers: 26000 },
      { platform: "kwai", handle: "diegorocha", url: "https://kwai.com/@diegorocha", startFollowers: 34000 },
      { platform: "tiktok", handle: "@diegorocha", url: "https://www.tiktok.com/@diegorocha", startFollowers: 51000 },
    ],
  },
  {
    name: "Elisa Prado",
    state: "RS",
    city: "Porto Alegre",
    avatarUrl: "https://i.pravatar.cc/150?img=15",
    profiles: [
      { platform: "instagram", handle: "@elisaprado", url: "https://instagram.com/elisaprado", startFollowers: 68000 },
      { platform: "x", handle: "@elisaprado", url: "https://x.com/elisaprado", startFollowers: 33000 },
      { platform: "youtube", handle: "ElisaPrado", url: "https://youtube.com/@ElisaPrado", startFollowers: 29000 },
    ],
  },
];

function generateMetrics(startFollowers, days = 30) {
  const metrics = [];
  let followers = startFollowers;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const growth = Math.floor(Math.random() * 120) + 30; // 30-149
    const posts = Math.floor(Math.random() * 3); // 0-2 posts/day
    followers += growth;
    metrics.push({
      date,
      followersCount: followers,
      postsCount: posts,
    });
  }
  return metrics;
}

async function seedDemo() {
  const names = demoInfluencers.map((d) => d.name);
  await prisma.influencer.deleteMany({ where: { name: { in: names } } });

  for (const influencer of demoInfluencers) {
    const created = await prisma.influencer.create({
      data: {
        name: influencer.name,
        state: influencer.state,
        city: influencer.city,
        avatarUrl: influencer.avatarUrl,
      },
    });

    for (const profile of influencer.profiles) {
      const social = await prisma.socialProfile.create({
        data: {
          influencerId: created.id,
          platform: profile.platform,
          handle: profile.handle,
          url: profile.url,
          externalId: profile.handle.replace(/^@/, ""),
        },
      });

      const metrics = generateMetrics(profile.startFollowers);
      await prisma.metricDaily.createMany({
        data: metrics.map((m) => ({
          socialProfileId: social.id,
          date: m.date,
          followersCount: m.followersCount,
          postsCount: m.postsCount,
        })),
        skipDuplicates: true,
      });
    }
    console.log(`Seeded demo influencer: ${influencer.name}`);
  }
}

seedDemo()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
