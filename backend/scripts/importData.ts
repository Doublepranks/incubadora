
import fs from 'fs';
import path from 'path';
import { PrismaClient, Platform, Series, Sex } from '@prisma/client';

const prisma = new PrismaClient();

// Map CSV 'Divisão' to Enum Series
const SERIES_MAP: Record<string, Series> = {
    'Elite': 'Elite',
    'A-2': 'A2',
    'A2': 'A2',
    'Institucional': 'Institucional',
    'Cortes': 'Cortes',
    'Noticias': 'Noticias'
};

// Map CSV 'Rede' to Enum Platform
const PLATFORM_MAP: Record<string, Platform> = {
    'Instagram': 'instagram',
    'instagram': 'instagram',
    'TikTok': 'tiktok',
    'tiktok': 'tiktok',
    'X': 'x',
    'x': 'x',
    'Youtube': 'youtube',
    'youtube': 'youtube',
    'KB': 'kwai', // Just in case
    'Kwai': 'kwai',
    'kwai': 'kwai'
};

async function main() {
    const csvPath = path.resolve(__dirname, '../../Data/dado.csv');
    console.log(`Reading CSV from: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found!');
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);

    // Skip header
    const dataLines = lines.slice(1).filter(l => l.trim().length > 0);

    console.log(`Found ${dataLines.length} lines to process.`);

    let processed = 0;
    let errors = 0;

    // Pre-load existing influencers into cache
    const existing = await prisma.influencer.findMany({ select: { id: true, name: true } });
    const influencerCache = new Map<string, number>();
    existing.forEach(i => influencerCache.set(i.name.toLowerCase().trim(), i.id));

    console.log(`Loaded ${influencerCache.size} existing influencers into cache.`);

    for (const line of dataLines) {
        try {
            // CSV: PortaVoz,Rede,Data,Seguidores,Divisão,Estado,Município
            // Handle potential simple CSV split (assuming no commas in values for now)
            const cols = line.split(',');
            if (cols.length < 7) {
                console.warn(`Skipping invalid line: ${line}`);
                errors++;
                continue;
            }

            const name = cols[0].trim();
            const networkRaw = cols[1].trim();
            const dateRaw = cols[2].trim(); // 05/03/2025 00:00:00
            const followersRaw = cols[3].trim();
            const seriesRaw = cols[4].trim();
            const state = cols[5].trim().toUpperCase();
            const city = cols[6].trim();

            // Validate/Map Series
            const series = SERIES_MAP[seriesRaw] || SERIES_MAP[seriesRaw.replace('-', '')] || null;

            // Validate/Map Platform
            const platform = PLATFORM_MAP[networkRaw] || PLATFORM_MAP[networkRaw.toLowerCase()];
            if (!platform) {
                // console.warn(`Unknown platform '${networkRaw}' for ${name}. Skipping.`);
                continue;
            }

            // Parse Date: 05/03/2025 00:00:00 -> Date
            const [datePart] = dateRaw.split(' ');
            const [day, month, year] = datePart.split('/').map(Number);
            const date = new Date(year, month - 1, day);
            // Set to UTC midnight to match application logic usually
            // Actually, prisma stores DateTime. Let's keep it strictly defined.
            // Application uses 'date' column as specific day.

            // Remove dots (thousand separators) and parse
            const followersStr = followersRaw.replace(/\./g, '');
            const followers = parseInt(followersStr, 10);

            if (isNaN(followers)) {
                // console.warn(`Invalid followers count '${followersRaw}' for ${name}. Skipping.`);
                continue;
            }

            // 1. Get Influencer ID from Cache or Create
            const nameKey = name.toLowerCase().trim();
            let infId = influencerCache.get(nameKey);

            if (!infId) {
                // Double check DB just in case (though cache should have it)
                let inf = await prisma.influencer.findFirst({
                    where: { name: { equals: name, mode: 'insensitive' } }
                });

                if (!inf) {
                    inf = await prisma.influencer.create({
                        data: {
                            name,
                            state,
                            city,
                            series: series || undefined,
                            avatarUrl: null
                        }
                    });
                    console.log(`Created new influencer: ${name}`);
                } else {
                    // Update metadata if needed
                    await prisma.influencer.update({
                        where: { id: inf.id },
                        data: {
                            series: series || inf.series,
                            state: state || inf.state,
                            city: city || inf.city
                        }
                    });
                }

                infId = inf.id;
                influencerCache.set(nameKey, infId);
            } else {
                // Update metadata (optional, skipping for perf unless critical)
                // But user asked to maintain series.
                // We can do an update.
                await prisma.influencer.update({
                    where: { id: infId },
                    data: {
                        series: series || undefined, // Update series if present
                        state: state || undefined,
                        city: city || undefined
                    }
                });
            }

            // 2. Upsert Social Profile
            // Search by influencerId + platform
            let profile = await prisma.socialProfile.findFirst({
                where: { influencerId: infId, platform }
            });

            if (!profile) {
                profile = await prisma.socialProfile.create({
                    data: {
                        influencerId: infId,
                        platform,
                        handle: 'imported',
                        url: null // null is allowed?
                    }
                });
            }

            // 3. Upsert MetricDaily
            // Unique constraint on [socialProfileId, date]
            // We need to match the date correctly. Prisma stores DateTime.
            // If we construct Date(2025, 2, 5), it is local time. 
            // Ideally we store UTC dates at midnight.
            const utcDate = new Date(Date.UTC(year, month - 1, day));

            await prisma.metricDaily.upsert({
                where: {
                    socialProfileId_date: {
                        socialProfileId: profile.id,
                        date: utcDate
                    }
                },
                update: {
                    followersCount: followers
                },
                create: {
                    socialProfileId: profile.id,
                    date: utcDate,
                    followersCount: followers,
                    postsCount: 0 // CSV doesn't have posts
                }
            });

            processed++;
            if (processed % 100 === 0) process.stdout.write('.');

        } catch (err) {
            console.error(`Error processing line: ${line}`, err);
            errors++;
        }
    }

    console.log(`\nImport complete! Processed: ${processed}, Errors: ${errors}`);
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
