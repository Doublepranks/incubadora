/**
 * Remove dados de mock e normaliza Nadson.
 * - Remove influencers de mock: Ana Costa, Bruno Lima, Carla Mendes, Diego Rocha, Elisa Prado.
 * - Mantém apenas uma entrada de Nadson (nome contendo "nadson"), renomeando para
 *   "Nadson Ferreira", cidade "Moju", estado "PA"; remove duplicatas.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MOCK_NAMES = ["Ana Costa", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Elisa Prado"];

async function removeMocks() {
  const deleted = await prisma.influencer.deleteMany({
    where: { name: { in: MOCK_NAMES } },
  });
  console.log(`Mock influencers removidos: ${deleted.count}`);
}

async function normalizeNadson() {
  const nadsons = await prisma.influencer.findMany({
    where: { name: { contains: "nadson", mode: "insensitive" } },
    include: { socialProfiles: { include: { metrics: true } } },
  });
  if (nadsons.length === 0) {
    console.log("Nenhum Nadson encontrado para normalizar.");
    return;
  }
  // Escolhe o que tem mais métricas; fallback: mais perfis; fallback: primeiro.
  const scored = nadsons
    .map((inf) => ({
      inf,
      metrics: inf.socialProfiles.reduce((acc, sp) => acc + sp.metrics.length, 0),
      profiles: inf.socialProfiles.length,
    }))
    .sort((a, b) => {
      if (b.metrics !== a.metrics) return b.metrics - a.metrics;
      if (b.profiles !== a.profiles) return b.profiles - a.profiles;
      return 0;
    });

  const keeper = scored[0].inf;
  const toDelete = scored.slice(1).map((s) => s.inf);

  // Delete duplicatas
  for (const inf of toDelete) {
    await prisma.influencer.delete({ where: { id: inf.id } });
    console.log(`Duplicata de Nadson removida: id=${inf.id}, nome=${inf.name}`);
  }

  // Atualiza o registro final
  await prisma.influencer.update({
    where: { id: keeper.id },
    data: {
      name: "Nadson Ferreira",
      city: "Moju",
      state: "PA",
    },
  });
  console.log(`Nadson normalizado no id=${keeper.id}`);
}

async function run() {
  await removeMocks();
  await normalizeNadson();
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
