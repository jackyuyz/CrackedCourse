import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const serverEnvSchema = publicEnvSchema.extend({
  MAX_SYLLABUS_SIZE_MB: z.coerce.number().positive().max(50).default(15),
  EXTRACTION_PROVIDER: z.string().default("fixture"),
  EXTRACTION_MODEL: z.string().default("fixture-v1"),
  EXTRACTION_API_KEY: z.string().min(1).optional(),
});

const rawPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

export function hasSupabaseEnv() {
  return publicEnvSchema.safeParse(rawPublicEnv).success;
}

export function getPublicEnv() {
  return publicEnvSchema.parse(rawPublicEnv);
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    ...rawPublicEnv,
    MAX_SYLLABUS_SIZE_MB: process.env.MAX_SYLLABUS_SIZE_MB,
    EXTRACTION_PROVIDER: process.env.EXTRACTION_PROVIDER,
    EXTRACTION_MODEL: process.env.EXTRACTION_MODEL,
    EXTRACTION_API_KEY: process.env.EXTRACTION_API_KEY,
  });
}

export function isDemoMode() {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    (process.env.NODE_ENV === "development" && !hasSupabaseEnv())
  );
}
