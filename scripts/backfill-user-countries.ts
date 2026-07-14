import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// Weighted so India shows up often (your primary market), rest spread across
// the other countries we actually have Holiday data for.
const WEIGHTED_COUNTRIES = ["IN", "IN", "IN", "US", "US", "GB", "CA", "AU", "DE", "FR", "JP", "BR"];

async function main() {
  const users = await db.user.findMany({ where: { country: null } });
  for (const user of users) {
    const country = WEIGHTED_COUNTRIES[Math.floor(Math.random() * WEIGHTED_COUNTRIES.length)];
    await db.user.update({ where: { id: user.id }, data: { country } });
  }
  console.log(`Backfilled country for ${users.length} users`);
}

main().catch(console.error).finally(() => db.$disconnect());
