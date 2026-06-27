const { prisma } = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'legal@gyftr.com', name: 'Legal Team', role: 'LEGAL' },
    { email: 'finance@gyftr.com', name: 'Finance Team', role: 'FINANCE' },
    { email: 'business@gyftr.com', name: 'Business Team', role: 'BUSINESS' },
    { email: 'compliance@gyftr.com', name: 'Compliance Team', role: 'COMPLIANCE' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        password: password,
      },
    });
    console.log(`Upserted user: ${user.email}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeding complete.");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
