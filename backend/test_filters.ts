import { prisma } from './src/config/db';
import { AgreementService } from './src/services/agreement.service';

async function main() {
  const result = await AgreementService.getAllAgreements({ search: 'HD' });
  console.log('Search "HD":', result.length, 'found');

  const result2 = await AgreementService.getAllAgreements({ status: 'DRAFT' });
  console.log('Status "DRAFT":', result2.length, 'found');
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
