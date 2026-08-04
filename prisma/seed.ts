import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = "a.molade@ulster.ac.uk";
  const passwordHash = await hashPassword("Password123!");

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Adeola Molade",
      programme: "MSc Computer Science",
      emailVerifiedAt: new Date(),
      passwordHash,
    },
    create: {
      name: "Adeola Molade",
      email,
      programme: "MSc Computer Science",
      passwordHash,
      emailVerifiedAt: new Date(),
      prefs: { create: {} },
    },
  });

  const existingTasks = await prisma.task.count({ where: { userId: user.id } });
  if (existingTasks === 0) {
    const now = Date.now();
    await prisma.task.createMany({
      data: [
        {
          userId: user.id,
          title: "Distributed Systems Report",
          description: "Literature review and architecture comparison",
          course: "Distributed Systems",
          courseCode: "COM701",
          deadline: new Date(now + 5 * 24 * 36e5),
          effort: "L",
          status: "in_progress",
          personalPreference: "high",
        },
        {
          userId: user.id,
          title: "Database Design Assignment",
          description: "ER diagram and normalization exercise",
          course: "Advanced Databases",
          courseCode: "COM702",
          deadline: new Date(now + 2 * 24 * 36e5),
          effort: "M",
          status: "not_started",
          personalPreference: "normal",
        },
        {
          userId: user.id,
          title: "Research Methods Quiz",
          description: "Weekly formative quiz",
          course: "Research Methods",
          courseCode: "RES600",
          deadline: new Date(now + 36 * 36e5),
          effort: "S",
          status: "not_started",
          personalPreference: "low",
        },
      ],
    });
  }

  console.log("Seed complete:", email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
