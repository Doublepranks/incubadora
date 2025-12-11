import { PrismaClient } from "@prisma/client";
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
    console.log("Starting notes migration...");

    const influencers = await prisma.influencer.findMany({
        where: {
            notes: {
                not: null,
            },
        },
    });

    console.log(`Found ${influencers.length} influencers with notes.`);

    let migratedCount = 0;

    for (const inf of influencers) {
        if (inf.notes && inf.notes.trim().length > 0) {
            // Check if note already exists to avoid duplicates if re-run
            // Simple check: content + influencerId
            const existing = await prisma.influencerNote.findFirst({
                where: {
                    influencerId: inf.id,
                    content: inf.notes,
                },
            });

            if (!existing) {
                await prisma.influencerNote.create({
                    data: {
                        influencerId: inf.id,
                        content: inf.notes,
                        // userId is null as we don't know the author
                    },
                });
                migratedCount++;
            }
        }
    }

    console.log(`Migration complete. Migrated ${migratedCount} notes.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
