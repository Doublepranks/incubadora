
import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/services/authService";

async function run() {
    const email = "sampantoja@local";
    const password = "changeme123";
    const name = "Sam Pantoja";
    const role = "system_admin"; // Matches existing role convention

    console.log(`Hashing password for ${email}...`);
    const passwordHash = await hashPassword(password);

    console.log(`Creating/Updating user ${email}...`);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                name,
                passwordHash,
                role,
            },
            create: {
                email,
                name,
                passwordHash,
                role,
            },
        });

        console.log(`✅ SUCCESS: User created/updated successfully.`);
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
    } catch (err) {
        console.error("❌ ERROR: Failed to create user.");
        console.error(err);
    }
}

run()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
