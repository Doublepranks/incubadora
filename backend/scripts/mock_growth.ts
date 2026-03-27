import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Criando dados simulados para teste de Top Crescimento...');

  // 1. Criar novo influenciador com crescimento astronômico realista (A)
  const inf1 = await prisma.influencer.create({
    data: {
      name: 'Influenciador Teste A (Crescimento Rápido)',
      city: 'São Paulo',
      state: 'SP',
      series: 'Elite',
      socialProfiles: {
        create: {
          platform: 'instagram',
          externalId: 'test_a',
          handle: 'test_a',
          url: 'https://instagram.com/test_a',
          metrics: {
            create: [
              // 30 dias atrás: 2.000 seguidores
              { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), followersCount: 2000, postsCount: 100 },
              // 15 dias atrás: 2.500 seguidores
              { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), followersCount: 2500, postsCount: 105 },
              // Hoje: 3.000 seguidores (Crescimento de 1.000 seguidores)
              { date: new Date(), followersCount: 3000, postsCount: 110 },
            ]
          }
        }
      }
    }
  });

  // 2. Criar novo influenciador com crescimento pequeno (B)
  const inf2 = await prisma.influencer.create({
    data: {
      name: 'Prefeitura Teste B (Crescimento Lento)',
      city: 'São Paulo',
      state: 'SP',
      series: 'Institucional',
      socialProfiles: {
        create: {
          platform: 'instagram',
          externalId: 'test_b',
          handle: 'test_b',
          url: 'https://instagram.com/test_b',
          metrics: {
            create: [
              // 30 dias atrás: 1.000.000 seguidores
              { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), followersCount: 1000000, postsCount: 5000 },
              // Hoje: 1.000.100 seguidores (Crescimento de apenas 100 seguidores)
              { date: new Date(), followersCount: 1000100, postsCount: 5002 },
            ]
          }
        }
      }
    }
  });

  // 3. Criar novo influenciador com apenas UMA métrica (recém adicionado) (C)
  const inf3 = await prisma.influencer.create({
    data: {
      name: 'Recém Adicionado Teste C (Deve sumir do ranking)',
      city: 'Rio de Janeiro',
      state: 'RJ',
      series: 'A2',
      socialProfiles: {
        create: {
          platform: 'instagram',
          externalId: 'test_c',
          handle: 'test_c',
          url: 'https://instagram.com/test_c',
          metrics: {
            create: [
              // Apenas cadastrado HOJE com 500 mil seguidores
              { date: new Date(), followersCount: 500000, postsCount: 15 },
            ]
          }
        }
      }
    }
  });

  console.log('Mock inserido com sucesso:');
  console.log(`- ${inf1.name} (ID: ${inf1.id}) - Cresceu 1k`);
  console.log(`- ${inf2.name} (ID: ${inf2.id}) - Cresceu 100`);
  console.log(`- ${inf3.name} (ID: ${inf3.id}) - Só 1 métrica, não deve aparecer`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
