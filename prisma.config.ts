import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed/seed.js",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
