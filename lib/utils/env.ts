import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  APP_SECRET: z.string().min(12).default("banana-mall-local-secret"),
  STORAGE_ROOT: z.string().default("./storage"),
  APP_RUNTIME: z.enum(["web", "desktop"]).default("web"),
  APP_USER_DATA_DIR: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("摹图"),
  ADMIN_SECRET: z.string().min(1).default("banana-admin"),
  AUTH_SERVER_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_SECRET: process.env.APP_SECRET,
  STORAGE_ROOT: process.env.STORAGE_ROOT,
  APP_RUNTIME: process.env.APP_RUNTIME,
  APP_USER_DATA_DIR: process.env.APP_USER_DATA_DIR,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  ADMIN_SECRET: process.env.ADMIN_SECRET,
  AUTH_SERVER_URL: process.env.AUTH_SERVER_URL,
});
