import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Clean existing data
  await prisma.tagsOnApplications.deleteMany();
  await prisma.prepTopic.deleteMany();
  await prisma.note.deleteMany();
  await prisma.interviewRound.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.application.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.company.deleteMany();

  // Tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'React', color: '#61dafb', category: 'tech_stack' } }),
    prisma.tag.create({ data: { name: 'TypeScript', color: '#3178c6', category: 'tech_stack' } }),
    prisma.tag.create({ data: { name: 'Node.js', color: '#68a063', category: 'tech_stack' } }),
    prisma.tag.create({ data: { name: 'Python', color: '#3776ab', category: 'tech_stack' } }),
    prisma.tag.create({ data: { name: 'System Design', color: '#e85d04', category: 'tech_stack' } }),
    prisma.tag.create({ data: { name: 'Go', color: '#00add8', category: 'tech_stack' } }),
    prisma.tag.create({ data: { name: 'Fintech', color: '#10b981', category: 'industry' } }),
    prisma.tag.create({ data: { name: 'Remote', color: '#8b5cf6', category: 'type' } }),
    prisma.tag.create({ data: { name: 'Startup', color: '#f59e0b', category: 'type' } }),
    prisma.tag.create({ data: { name: 'FAANG', color: '#ef4444', category: 'type' } }),
  ]);

  const [react, ts, node, python, sysDesign, go, fintech, remote, startup, faang] = tags;

  // Companies
  const google = await prisma.company.create({ data: { name: 'Google', website: 'https://google.com', industry: 'Technology' } });
  const stripe = await prisma.company.create({ data: { name: 'Stripe', website: 'https://stripe.com', industry: 'Fintech' } });
  const notion = await prisma.company.create({ data: { name: 'Notion', website: 'https://notion.so', industry: 'Productivity' } });
  const vercel = await prisma.company.create({ data: { name: 'Vercel', website: 'https://vercel.com', industry: 'Developer Tools' } });
  const coinbase = await prisma.company.create({ data: { name: 'Coinbase', website: 'https://coinbase.com', industry: 'Crypto/Fintech' } });
  const meta = await prisma.company.create({ data: { name: 'Meta', website: 'https://meta.com', industry: 'Technology' } });
  const datadog = await prisma.company.create({ data: { name: 'Datadog', website: 'https://datadoghq.com', industry: 'DevOps' } });

  // Applications
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);

  const app1 = await prisma.application.create({
    data: {
      companyId: google.id,
      role: 'Senior Frontend Engineer',
      stage: 'ROUND_1',
      priority: 3,
      salaryMin: 180000,
      salaryMax: 260000,
      location: 'Mountain View, CA',
      isRemote: false,
      appliedDate: daysAgo(14),
      tags: { create: [{ tagId: react.id }, { tagId: ts.id }, { tagId: faang.id }] },
    },
  });

  const app2 = await prisma.application.create({
    data: {
      companyId: stripe.id,
      role: 'Full Stack Engineer',
      stage: 'INTRODUCTORY_CALL',
      priority: 2,
      salaryMin: 170000,
      salaryMax: 240000,
      isRemote: true,
      appliedDate: daysAgo(7),
      tags: { create: [{ tagId: react.id }, { tagId: node.id }, { tagId: fintech.id }, { tagId: remote.id }] },
    },
  });

  const app3 = await prisma.application.create({
    data: {
      companyId: notion.id,
      role: 'Frontend Engineer',
      stage: 'APPLIED',
      priority: 2,
      salaryMin: 150000,
      salaryMax: 200000,
      location: 'San Francisco, CA',
      isRemote: true,
      appliedDate: daysAgo(3),
      tags: { create: [{ tagId: react.id }, { tagId: ts.id }, { tagId: startup.id }] },
    },
  });

  await prisma.application.create({
    data: {
      companyId: vercel.id,
      role: 'Software Engineer',
      stage: 'WISHLIST',
      priority: 1,
      isRemote: true,
      tags: { create: [{ tagId: react.id }, { tagId: node.id }, { tagId: remote.id }, { tagId: startup.id }] },
    },
  });

  await prisma.application.create({
    data: {
      companyId: coinbase.id,
      role: 'Backend Engineer',
      stage: 'REJECTED',
      salaryMin: 160000,
      salaryMax: 230000,
      isRemote: true,
      appliedDate: daysAgo(21),
      tags: { create: [{ tagId: go.id }, { tagId: fintech.id }] },
    },
  });

  await prisma.application.create({
    data: {
      companyId: meta.id,
      role: 'Production Engineer',
      stage: 'OFFER',
      priority: 3,
      salaryMin: 190000,
      salaryMax: 270000,
      location: 'Menlo Park, CA',
      appliedDate: daysAgo(30),
      tags: { create: [{ tagId: python.id }, { tagId: sysDesign.id }, { tagId: faang.id }] },
    },
  });

  await prisma.application.create({
    data: {
      companyId: datadog.id,
      role: 'Software Engineer - Platform',
      stage: 'APPLIED',
      priority: 1,
      isRemote: true,
      appliedDate: daysAgo(2),
      followUpDate: daysFromNow(5),
      tags: { create: [{ tagId: go.id }, { tagId: node.id }, { tagId: remote.id }] },
    },
  });

  // Interview rounds for Google app
  const round1 = await prisma.interviewRound.create({
    data: {
      applicationId: app1.id,
      roundNumber: 1,
      type: 'INTRO_CALL',
      status: 'COMPLETED',
      scheduledAt: daysAgo(10),
      durationMin: 30,
      interviewerName: 'Sarah Chen',
      reflection: 'Good intro call, discussed team culture and role expectations. They seem excited about my React experience.',
      difficulty: 2,
    },
  });

  const round2 = await prisma.interviewRound.create({
    data: {
      applicationId: app1.id,
      roundNumber: 2,
      type: 'DSA',
      status: 'UPCOMING',
      scheduledAt: daysFromNow(2),
      durationMin: 60,
      interviewerName: 'Mike Johnson',
      prepNotes: 'Focus on arrays, trees, and dynamic programming. Practice medium-level LeetCode problems.',
    },
  });

  const round3 = await prisma.interviewRound.create({
    data: {
      applicationId: app1.id,
      roundNumber: 3,
      type: 'SYSTEM_DESIGN',
      status: 'UPCOMING',
      scheduledAt: daysFromNow(5),
      durationMin: 45,
      prepNotes: 'Review: URL shortener, rate limiter, news feed design.',
    },
  });

  // Prep topics for DSA round
  await prisma.prepTopic.createMany({
    data: [
      { interviewRoundId: round2.id, title: 'Binary search variations', completed: true },
      { interviewRoundId: round2.id, title: 'BFS/DFS tree traversal', completed: true },
      { interviewRoundId: round2.id, title: 'Dynamic programming - knapsack, LIS', completed: false },
      { interviewRoundId: round2.id, title: 'Graph algorithms - Dijkstra, topological sort', completed: false },
      { interviewRoundId: round2.id, title: 'Sliding window problems', completed: true },
    ],
  });

  // Prep topics for System Design round
  await prisma.prepTopic.createMany({
    data: [
      { interviewRoundId: round3.id, title: 'Design URL shortener', completed: false },
      { interviewRoundId: round3.id, title: 'Design rate limiter', completed: false },
      { interviewRoundId: round3.id, title: 'Review CAP theorem & consistency models', completed: false },
    ],
  });

  // Stripe interview round
  await prisma.interviewRound.create({
    data: {
      applicationId: app2.id,
      roundNumber: 1,
      type: 'INTRO_CALL',
      status: 'UPCOMING',
      scheduledAt: daysFromNow(1),
      durationMin: 45,
      prepNotes: 'Review payment systems basics. Stripe API patterns.',
    },
  });

  // Contacts
  await prisma.contact.create({
    data: {
      applicationId: app1.id,
      name: 'Sarah Chen',
      email: 'sarah@google.com',
      role: 'RECRUITER',
      company: 'Google',
      lastContactedAt: daysAgo(10),
    },
  });

  await prisma.contact.create({
    data: {
      applicationId: app2.id,
      name: 'Alex Rivera',
      email: 'alex@stripe.com',
      linkedIn: 'https://linkedin.com/in/alexrivera',
      role: 'HIRING_MANAGER',
      company: 'Stripe',
    },
  });

  await prisma.contact.create({
    data: {
      name: 'Jamie Park',
      linkedIn: 'https://linkedin.com/in/jamiepark',
      role: 'REFERRAL',
      company: 'Notion',
      notes: 'College friend, works on the frontend team',
    },
  });

  // Notes
  await prisma.note.create({
    data: {
      applicationId: app1.id,
      content: 'Team works on Google Cloud Console. Heavy React + TypeScript. They use an internal design system.',
    },
  });

  await prisma.note.create({
    data: {
      applicationId: app3.id,
      content: 'Applied through Jamie Park referral. Should follow up in a week if no response.',
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
