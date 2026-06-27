import { prisma } from './src/config/db';

async function main() {
  const agreements = await prisma.agreement.findMany({
    include: {
      legalSpoc: true,
      financeSpoc: true,
      businessSpoc: true,
      complianceSpoc: true,
    }
  });
  console.log(JSON.stringify(agreements, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
