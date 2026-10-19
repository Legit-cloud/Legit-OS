import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, username: true },
  });
  console.log(`Found ${users.length} total users.`);

  for (const u of users) {
    if (!u.username) {
      let baseSlug = u.role === 'ADMIN'
        ? 'admin'
        : u.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'user';

      let slug = baseSlug;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: slug } })) {
        counter++;
        slug = `${baseSlug}-${counter}`;
      }

      await prisma.user.update({
        where: { id: u.id },
        data: { username: slug },
      });
      console.log(`Assigned username for ${u.role} (${u.email}): ${slug}`);
    } else {
      console.log(`User ${u.email} already has username: ${u.username}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
