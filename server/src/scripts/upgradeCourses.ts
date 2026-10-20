import { prisma } from '../lib/prisma';
import { sampleCurriculums, buildDefaultModules } from '../lib/curriculumData';

async function main() {
  const courses = await prisma.course.findMany();
  console.log(`Found ${courses.length} courses in database.`);

  for (const c of courses) {
    let modules = sampleCurriculums[c.slug];
    if (!modules || modules.length === 0) {
      modules = buildDefaultModules(c.title, c.durationWeeks || 6);
    }

    await prisma.course.update({
      where: { id: c.id },
      data: {
        modulesJson: JSON.stringify(modules),
      },
    });
    console.log(`Updated course ${c.title} (${c.slug}) with ${modules.length} rich modules.`);
  }

  console.log('Curriculum upgrade completed successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to upgrade courses:', err);
  process.exit(1);
});
