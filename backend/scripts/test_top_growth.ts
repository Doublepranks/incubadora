import { getTopGrowth } from '../src/services/metricsService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testando query atualizada de Top Growth (Últimos 30 dias)...');
  const results = await getTopGrowth({ periodDays: 30 }, 5);
  console.log(JSON.stringify(results, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
