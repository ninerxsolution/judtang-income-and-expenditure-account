import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

if (process.env.APP_ENV === "development") {
  console.log(env("DATABASE_URL"));
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
