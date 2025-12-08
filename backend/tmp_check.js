const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany();
  console.log(users);
  await prisma.();
})();
