
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for duplicate influencers...');

    const duplicates = await prisma.$queryRaw<Array<{ name: string, count: number }>>`
        SELECT name, COUNT(*) as count
        FROM "Influencer"
        GROUP BY name
        HAVING COUNT(*) > 1
    `;

    // Type casting because queryRaw returns unknown
    const dups = duplicates as unknown as Array<{ name: string, count: bigint }>;

    console.log(`Found ${dups.length} names with duplicates.`);

    for (const d of dups) {
        const name = d.name;
        console.log(`Processing duplicates for: ${name}`);

        const influencers = await prisma.influencer.findMany({
            where: { name: name },
            orderBy: { createdAt: 'asc' }, // Keep oldest
            include: { socialProfiles: true }
        });

        if (influencers.length < 2) continue;

        const [primary, ...others] = influencers;
        console.log(`Keeping ID: ${primary.id}, merging/deleting ${others.length} others.`);

        for (const other of others) {
            // Move profiles to primary? 
            // Or just delete if they are empty/duplicate?
            // User script created profiles too.
            // If primary already has profile for platform X, and other has profile for platform X, we need to merge metrics?
            // "importData.ts" was creating profiles and metrics.
            // Simplest is to move metrics to primary's profile.

            for (const otherProfile of other.socialProfiles) {
                // Find matching profile in primary
                const primaryProfile = await prisma.socialProfile.findFirst({
                    where: { influencerId: primary.id, platform: otherProfile.platform }
                });

                if (primaryProfile) {
                    // Move metrics from otherProfile to primaryProfile
                    // But metric has unique constraint on [socialProfileId, date].
                    // If conflict, delete other's metric (assume target has it).
                    const otherMetrics = await prisma.metricDaily.findMany({
                        where: { socialProfileId: otherProfile.id }
                    });

                    for (const m of otherMetrics) {
                        try {
                            await prisma.metricDaily.update({
                                where: { id: m.id },
                                data: { socialProfileId: primaryProfile.id }
                            });
                        } catch (e) {
                            // Unique constraint violation -> Primary already has this date. Delete duplicate.
                            await prisma.metricDaily.delete({ where: { id: m.id } });
                        }
                    }
                } else {
                    // Start owning the profile
                    await prisma.socialProfile.update({
                        where: { id: otherProfile.id },
                        data: { influencerId: primary.id }
                    });
                }
            }

            // Now safe to delete 'other' influencer
            await prisma.influencer.delete({ where: { id: other.id } });
        }
    }

    console.log('Deduplication complete.');
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
