import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/services/authService";

async function main() {
    const email = process.env.SYSTEM_ADMIN_EMAIL || "system@incubadora.com";
    const password = process.env.SYSTEM_ADMIN_PASSWORD || "system_admin_secure";
    const name = "System Administrator";

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            passwordHash,
            role: "system_admin"
        },
        create: {
            email,
            name,
            passwordHash,
            role: "system_admin"
        },
    });

    console.log(`
  ✅ System Admin User Created/Updated:
  -------------------------------------
  Name:     ${user.name}
  Email:    ${user.email}
  Password: ${password}
  Role:     ${user.role}
  -------------------------------------
  `);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
