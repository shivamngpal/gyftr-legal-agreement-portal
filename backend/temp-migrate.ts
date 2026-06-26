import { prisma } from "./src/config/db";

async function main() {
  await prisma.reviewStatus.deleteMany({});
  console.log("Deleted all old review statuses.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
