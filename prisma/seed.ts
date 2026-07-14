import "dotenv/config";
console.log("DATABASE_URL loaded:", process.env.DATABASE_URL ? "yes" : "MISSING");
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// ...rest of the seed script stays exactly as before

async function main() {
  const usedHandles = new Set<string>();

  function uniqueHandle(name: string) {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    let handle = base;
    let suffix = 1;
    while (usedHandles.has(handle)) handle = `${base}${suffix++}`;
    usedHandles.add(handle);
    return handle;
  }

  const users = Array.from({ length: 100 }).map(() => {
    const name = faker.person.fullName();
    const handle = uniqueHandle(name);
    return {
      name,
      handle,
      email: `${handle}@example.com`, // derived from the already-unique handle, so guaranteed unique
      image: faker.image.avatar(),
    };
  });

  await db.user.createMany({ data: users, skipDuplicates: true });
  console.log(`Seeded ${users.length} creators.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());