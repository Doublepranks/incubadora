const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "sampantoja@local";
  const name = process.env.ADMIN_NAME || "Sam Pantoja";
  const passwordHash =
    process.env.ADMIN_HASH ||
    "$2a$10$9wWpiMaSZTaULlKE7jDEnOEG5Ruc7w986IPSb3xDvArFSzyriXW/.";

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "admin_global" },
    create: { name, email, passwordHash, role: "admin_global" },
  });
  console.log(`Admin upserted: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
