import { prisma } from './src/config/db';

async function main() {
  const legalUser = await prisma.user.findFirst({ where: { role: 'LEGAL' } });
  const financeUser = await prisma.user.findFirst({ where: { role: 'FINANCE' } });
  const businessUser = await prisma.user.findFirst({ where: { role: 'BUSINESS' } });
  const complianceUser = await prisma.user.findFirst({ where: { role: 'COMPLIANCE' } });

  const updateData: any = {};
  if (legalUser) updateData.legalSpocId = legalUser.id;
  if (financeUser) updateData.financeSpocId = financeUser.id;
  if (businessUser) updateData.businessSpocId = businessUser.id;
  if (complianceUser) updateData.complianceSpocId = complianceUser.id;

  const result = await prisma.agreement.updateMany({
    data: updateData
  });

  console.log(`Updated ${result.count} agreements with default SPOCs.`);
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
