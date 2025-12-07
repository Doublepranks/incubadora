const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../dist/services/authService");

async function main() {
  const p = new PrismaClient();
  const email = process.env.NEW_USER_EMAIL;
  const password = process.env.NEW_USER_PASSWORD;
  const name = process.env.NEW_USER_NAME || "Admin";
  const role = process.env.NEW_USER_ROLE || "admin_global";
  if (!email || !password) {
    throw new Error("NEW_USER_EMAIL and NEW_USER_PASSWORD are required");
  }
  const passwordHash = await hashPassword(password);
  const user = await p.user.upsert({
    where: { email },
    update: { name, passwordHash, role },
    create: { email, name, passwordHash, role },
  });
  await p.$disconnect();
  console.log(`created/updated user ${email} with role ${role}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
