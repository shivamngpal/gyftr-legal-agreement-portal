import { prisma } from "../src/config/db";
import { hashPassword } from "../src/utils/password";

async function main() {
  console.log("Starting database seed...");

  const defaultPassword = await hashPassword("password123");

  const users = [
    {
      email: "legal@gyftr.com",
      name: "Legal Team Lead",
      role: "LEGAL" as const,
      password: defaultPassword,
    },
    {
      email: "finance@gyftr.com",
      name: "Finance Team Lead",
      role: "FINANCE" as const,
      password: defaultPassword,
    },
    {
      email: "business@gyftr.com",
      name: "Business Team Lead",
      role: "BUSINESS" as const,
      password: defaultPassword,
    },
    {
      email: "compliance@gyftr.com",
      name: "Compliance Team Lead",
      role: "COMPLIANCE" as const,
      password: defaultPassword,
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log(`Seeded user: ${user.name} (${user.email}) - Role: ${user.role}`);
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during database seeding:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
