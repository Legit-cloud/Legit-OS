import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sampleCurriculums, buildDefaultModules } from '../src/lib/curriculumData';

const prisma = new PrismaClient();
const days = (n: number) => new Date(Date.now() + n * 24 * 3600 * 1000);

async function main() {
  // Wipe in dependency order so the seed is repeatable.
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.eventRsvp.deleteMany(),
    prisma.hubEvent.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.transitRequest.deleteMany(),
    prisma.rider.deleteMany(),
    prisma.paymentProof.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.loungeOrder.deleteMany(),
    prisma.catalogItem.deleteMany(),
    prisma.userCourse.deleteMany(),
    prisma.course.deleteMany(),
    prisma.partner.deleteMany(),
    prisma.telemetryLog.deleteMany(),
    prisma.newsletterSubscriber.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const admin = await prisma.user.create({
    data: { fullName: 'Hub Administrator', username: 'admin', email: 'admin@legithub.com', passwordHash: hash('Admin@12345'), role: 'ADMIN', tier: 'VIP', verified: true, badge: 'Hub Legend', points: 1200 },
  });
  const demo = await prisma.user.create({
    data: { fullName: 'Ada Innovator', username: 'ada-innovator', email: 'demo@legithub.com', passwordHash: hash('Demo@12345'), phone: '+234 801 234 5678', points: 120, streakDays: 3, lastActiveAt: days(-1) },
  });
  const members = await Promise.all(
    [
      ['Sophia Reynolds', 'PRO_MONTHLY', 'Power Builder', 640],
      ['Daniel Okafor', 'VIP', 'Hub Legend', 1100],
      ['Tobi Adeyemi', 'PAY_AS_YOU_GO', 'Rising Innovator', 210],
      ['Chiamaka Eze', 'PRO_MONTHLY', 'Rising Innovator', 330],
      ['Ibrahim Musa', 'PAY_AS_YOU_GO', 'New Member', 40],
    ].map(([fullName, tier, badge, points], i) =>
      prisma.user.create({
        data: {
          fullName: fullName as string,
          username: (fullName as string).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
          email: `${(fullName as string).split(' ')[0].toLowerCase()}@example.com`,
          passwordHash: hash('Member@12345'),
          tier: tier as 'PAY_AS_YOU_GO',
          badge: badge as string,
          points: points as number,
          verified: i < 3,
        },
      }),
    ),
  );

  const courses = [
    ['full-stack-web', 'Full-Stack Web Development', 'React, Node.js, databases and deployment — ship production web apps end to end.', 'Intermediate', 16, 120000],
    ['genai-cybersecurity', 'GenAI Cybersecurity & Ethical Hacking', 'Offensive and defensive security with AI-assisted tooling, recon, and incident response.', 'Advanced', 12, 120000],
    ['python-mastery', 'Python Mastery', 'Advanced Python: async, data pipelines, testing, packaging and automation.', 'Advanced', 10, 120000],
    ['video-editing', 'In-Depth Video Editing', 'Storytelling, colour grading and motion graphics in the hub creative studio.', 'Beginner', 8, 70000],
    ['project-management', 'Project Management', 'Agile, Scrum and stakeholder management for tech teams.', 'Beginner', 6, 70000],
    ['python-beginners', 'Python for Absolute Beginners', 'Zero to confident: variables, loops, functions and your first projects.', 'Beginner', 6, 70000],
  ] as const;
  for (const [slug, title, description, level, durationWeeks, fullPrice] of courses) {
    const modules = sampleCurriculums[slug] || buildDefaultModules(title, durationWeeks);
    await prisma.course.create({
      data: {
        slug,
        title,
        description,
        level,
        durationWeeks,
        fullPrice,
        halfPrice: fullPrice / 2,
        modulesJson: JSON.stringify(modules),
      },
    });
  }

  // Prices marked "placeholder" were not in the brief — adjust them in Admin → Hub Assets.
  const catalog: [string, string, string, number, string][] = [
    ['DESK', 'Hot Desk (Hourly)', 'Any open desk, fibre internet, 24/7 power', 1000, 'hour'], // placeholder
    ['DESK', 'Day Pass', 'Full-day desk access with lounge perks', 5000, 'day'], // placeholder
    ['FACILITY', 'Media Studio', 'Sound-treated studio with cameras & lighting', 10000, 'hour'],
    ['FACILITY', 'Private Office', 'Lockable office for up to 4', 2000, 'hour'],
    ['FACILITY', 'Conference Room', 'Seats 12, 75" display, video conferencing', 10000, 'hour'],
    ['FACILITY', 'Classroom', 'Seats 30, projector & whiteboards', 10000, 'hour'],
    ['PROGRAM', 'CC HUB / GATEWAY', 'Gateway incubation track with mentor office hours', 25000, 'month'], // placeholder
    ['PROGRAM', 'J.B.C', 'Founders community & build sprints subscription', 30000, 'month'], // placeholder
    ['HARDWARE', 'HP ZBook Workstation', 'Core i7, 32GB RAM, RTX GPU', 7500, 'day'], // placeholder
    ['HARDWARE', 'Lenovo ThinkPad P-Series', 'Core i7, 16GB RAM', 5000, 'day'], // placeholder
    ['HARDWARE', 'HP EliteBook', 'Core i5, 16GB RAM', 4000, 'day'], // placeholder
    ['LOUNGE', 'Shawarma', 'Chicken shawarma, double sausage', 3500, 'item'],
    ['LOUNGE', 'Burger', 'Beef burger with fries', 5000, 'item'],
    ['LOUNGE', 'Chick Whizz', 'Crispy chicken wrap', 3500, 'item'],
    ['LOUNGE', 'Munchkins', 'Bite-size doughnuts (pack)', 1500, 'item'], // placeholder
    ['LOUNGE', 'Soft Drink', 'Chilled 50cl bottle', 500, 'item'], // placeholder
  ];
  await prisma.catalogItem.createMany({
    data: catalog.map(([category, name, description, price, unit], sortOrder) => ({ category, name, description, price, unit, sortOrder })),
  });

  await prisma.rider.createMany({
    data: [
      { name: 'Kunle Bakare', phone: '+234 803 111 2233', vehicleType: 'Bike', plate: 'OYO-112-BK' },
      { name: 'Mama Sade', phone: '+234 805 222 3344', vehicleType: 'Keke', plate: 'OYO-447-KK' },
      { name: 'Emeka Obi', phone: '+234 807 333 4455', vehicleType: 'Cab', plate: 'OYO-901-CB' },
      { name: 'Femi Lawal', phone: '+234 809 444 5566', vehicleType: 'Bike', plate: 'OYO-238-BK' },
    ],
  });

  await prisma.hubEvent.createMany({
    data: [
      { title: 'Founders Friday: Pitch Night', description: 'Five startups pitch to angel investors. Networking after.', startsAt: days(4), capacity: 80 },
      { title: 'AI Builders Meetup', description: 'Hands-on session building GenAI apps with open models.', startsAt: days(9), capacity: 40 },
      { title: 'Hardware Lab Open Day', description: 'Tour the prototyping lab, 3D printers and GPU render farm.', startsAt: days(15), capacity: 60 },
      // Replace the external URL with the game portal the hub actually uses.
      { kind: 'GAME', title: 'Scrabble Arena', description: 'Weekly word battle — top scorer earns 100 hub points.', externalUrl: 'https://www.pogo.com/games/scrabble' },
      { kind: 'GAME', title: 'Chess Blitz', description: 'Five-minute blitz ladder for hub members.', externalUrl: 'https://lichess.org' },
    ],
  });

  await prisma.partner.createMany({
    data: [
      { name: 'Oyo State Ministry of Science & Tech', category: 'Government', description: 'Policy and grant partner' },
      { name: 'Ibadan Angels Network', category: 'Investor', description: 'Pre-seed and seed investment syndicate' },
      { name: 'Cloud Credits Alliance', category: 'Technology', description: 'Cloud credits for incubated startups' },
      { name: 'University of Ibadan Tech Society', category: 'Academic', description: 'Talent pipeline and research collaboration' },
    ],
  });

  const chat = [
    [members[1], 'Welcome to the Global Community channel! Pitch night is Friday — who is presenting?'],
    [members[0], 'PayFlow Africa will be there. Anyone free to review our deck before then?'],
    [members[2], 'I can help, I am at desk 14 all afternoon.'],
    [admin, 'Reminder: the GPU render farm is under maintenance from 8–10pm tonight.'],
  ] as const;
  for (const [i, [sender, content]] of chat.entries()) {
    await prisma.chatMessage.create({ data: { senderId: sender.id, content, createdAt: new Date(Date.now() - (chat.length - i) * 600e3) } });
  }
  await prisma.chatMessage.create({ data: { channel: `support:${demo.id}`, senderId: demo.id, content: 'Hi, how do I get access to the Media Studio on weekends?' } });

  const pm = await prisma.course.findUniqueOrThrow({ where: { slug: 'project-management' } });
  await prisma.invoice.create({ data: { userId: demo.id, kind: 'COURSE', refId: pm.id, amount: pm.halfPrice, description: `${pm.title} (50% installment)` } });
  await prisma.notification.create({ data: { userId: demo.id, title: 'Welcome to the Hub', body: 'Your L.E.G.I.T OS terminal is ready. Explore Infra, Academy and Network.' } });

  await prisma.telemetryLog.createMany({
    data: [
      { level: 'INFO', message: 'Database seeded' },
      { level: 'ADMIN', message: 'Admin session terminated: Hub Administrator', actorId: admin.id },
      { level: 'SECURITY', message: 'Failed sign-in attempt for unknown@example.com' },
    ],
  });

  console.log('Seed complete.');
  console.log('  Admin: admin@legithub.com / Admin@12345');
  console.log('  User:  demo@legithub.com  / Demo@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
