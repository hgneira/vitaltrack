import path from "path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: connectionString,
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  migrate: {
    adapter() {
      return new PrismaPg({ connectionString });
    },
  },
});
