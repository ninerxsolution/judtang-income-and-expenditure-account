import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const DEFAULT_USER = {
  email: "anna@example.com",
  name: "Anna",
  password: "password",
};

async function main() {
  let user = await prisma.user.findUnique({
    where: { email: DEFAULT_USER.email },
  });
  if (!user) {
    const hashedPassword = await bcrypt.hash(DEFAULT_USER.password, 10);
    user = await prisma.user.create({
      data: {
        email: DEFAULT_USER.email,
        name: DEFAULT_USER.name,
        password: hashedPassword,
      },
    });
    console.log("Created default user:", DEFAULT_USER.email);

    // Optional: seed a couple of activity log entries for dev
    await prisma.activityLog.createMany({
      data: [
        { userId: user.id, action: "USER_REGISTERED", entityType: "user", entityId: user.id, details: { name: user.name ?? user.email } },
        { userId: user.id, action: "USER_LOGGED_IN", entityType: "user", entityId: user.id },
      ],
    });
    console.log("Created sample activity log entries for user.");
  } else {
    console.log("Default user already exists:", DEFAULT_USER.email);
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
