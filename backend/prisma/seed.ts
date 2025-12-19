import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/services/authService";
import { Platform, Series, Sex } from "@prisma/client";

const CITIES = [
  { city: "São Paulo", state: "SP" },
  { city: "Rio de Janeiro", state: "RJ" },
  { city: "Belo Horizonte", state: "MG" },
  { city: "Porto Alegre", state: "RS" },
  { city: "Curitiba", state: "PR" },
  { city: "Salvador", state: "BA" },
  { city: "Recife", state: "PE" },
  { city: "Fortaleza", state: "CE" },
  { city: "Brasília", state: "DF" },
  { city: "Manaus", state: "AM" },
];

const SERIES: Series[] = ["Elite", "A2", "A3", "Institucional", "Cortes", "Noticias"];

const MALE_NAMES = ["Carlos", "João", "Pedro", "Lucas", "Mateus", "Gabriel", "Rafael", "Bruno", "Daniel", "Eduardo"];
const FEMALE_NAMES = ["Ana", "Maria", "Julia", "Fernanda", "Larissa", "Amanda", "Beatriz", "Camila", "Mariana", "Bruna"];
const SURNAMES = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima", "Costa"];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@admin.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "admin_global" },
    create: { email, name, passwordHash, role: "admin_global" },
  });
  console.log(`Seeded admin: ${email}`);
}

async function clearDatabase() {
  console.log("Clearing database...");
  await prisma.metricDaily.deleteMany();
  await prisma.socialProfile.deleteMany();
  await prisma.influencer.deleteMany();
  // Keep users (admins) to allow login
}

function generateHistory(startFollowers: number, months: number = 6) {
  const metrics = [];
  const today = new Date();

  // Start from approximately 6 months ago, aligned to a Monday if possible?
  // Let's just go back 26 weeks.
  const weeks = 26;
  let currentFollowers = startFollowers;
  let currentPosts = randomInt(50, 500);

  for (let w = weeks; w >= 0; w--) {
    const date = new Date(today);
    date.setDate(date.getDate() - (w * 7)); // Weekly points

    // Ensure it falls on a day "around" Monday if we wanted, but simple -7 days is fine for "weekly".

    // Growth logic: Linear + Random noise
    const weeklyGrowth = Math.floor(startFollowers * 0.02) + randomInt(-100, 500); // ~2% weekly growth
    const postsAdded = randomInt(0, 5);

    currentFollowers += Math.max(0, weeklyGrowth); // No negative followers usually
    currentPosts += postsAdded;

    metrics.push({
      date,
      followersCount: currentFollowers,
      postsCount: currentPosts,
    });
  }
  return metrics;
}

async function seedMockData() {
  console.log("Generating 100 mock influencers...");

  const total = 100;
  const targetFemale = 35; // 35% to be safe > 30%

  for (let i = 0; i < total; i++) {
    const isFemale = i < targetFemale;
    const firstName = isFemale ? randomElement(FEMALE_NAMES) : randomElement(MALE_NAMES);
    const surname = randomElement(SURNAMES);
    const name = `${firstName} ${surname}`;
    const sex: Sex = isFemale ? "feminino" : "masculino";

    const location = randomElement(CITIES);
    const series = randomElement(SERIES);

    // Create Influencer
    const influencer = await prisma.influencer.create({
      data: {
        name,
        state: location.state,
        city: location.city,
        avatarUrl: `https://ui-avatars.com/api/?name=${name.replace(" ", "+")}&background=random`,
        sex,
        series,
      },
    });

    // Create Profiles (All 5 platforms for rich data)
    const platforms: Platform[] = ["instagram", "x", "youtube", "tiktok", "kwai"];

    for (const p of platforms) {
      const startFollowers = randomInt(10000, 2000000); // 10k to 2M
      const handle = `@${firstName.toLowerCase()}${surname.toLowerCase()}_${p}`;

      const profile = await prisma.socialProfile.create({
        data: {
          influencerId: influencer.id,
          platform: p,
          handle,
          url: `https://${p}.com/${handle}`,
        }
      });

      // Generate 6 months of weekly history
      const history = generateHistory(startFollowers);

      const metricsData = history.map(h => ({
        socialProfileId: profile.id,
        date: h.date,
        followersCount: h.followersCount,
        postsCount: h.postsCount
      }));

      await prisma.metricDaily.createMany({
        data: metricsData
      });
    }

    if (i % 10 === 0) console.log(`Generated ${i} / ${total}`);
  }

  console.log("Mock data generation complete.");
}

async function main() {
  await seedAdmin(); // Always ensure admin exists
  await clearDatabase();
  await seedMockData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
