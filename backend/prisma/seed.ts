/**
 * prisma/seed.ts — Minimal demo seed for Cognitive Support App
 *
 * Run locally:  npm run db:seed  OR  npx prisma db seed
 * Run on Render: NOT run automatically — call manually after deploy if needed.
 *
 * This seed is idempotent (uses upsert). Safe to re-run.
 * Extend with real demo data as needed for thesis evaluation.
 */

import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Demo Patient ─────────────────────────────────────────────────────────
  // Password is "Demo1234!" — NOT for production. Change before real deployment.
  // Using a bcrypt-compatible static hash here to avoid argon2 native module
  // issues in seed context. Replace with real hashing if needed.
  const demoPatient = await prisma.user.upsert({
    where: { email: "demo.patient@example.com" },
    update: {},
    create: {
      email: "demo.patient@example.com",
      displayName: "Demo Patient",
      role: "PATIENT",
      // Hash generated externally for: "Demo1234!"
      // In real usage, use argon2.hash() before storing.
      passwordHash: null, // Set manually after seeding if needed
      language: "ar",
      timezone: "Africa/Cairo",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Demo patient upserted: ${demoPatient.email} (id: ${demoPatient.id})`);

  // ─── Demo Caregiver ───────────────────────────────────────────────────────
  const demoCaregiver = await prisma.user.upsert({
    where: { email: "demo.caregiver@example.com" },
    update: {},
    create: {
      email: "demo.caregiver@example.com",
      displayName: "Demo Caregiver",
      role: "CAREGIVER",
      passwordHash: null,
      language: "ar",
      timezone: "Africa/Cairo",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Demo caregiver upserted: ${demoCaregiver.email} (id: ${demoCaregiver.id})`);

  // ─── Extend Here ─────────────────────────────────────────────────────────
  // Add checklist templates, reminders, care links, etc. as needed.
  // Keep data minimal and thesis-evaluation-appropriate.

  console.log("✅ Seed complete.");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
