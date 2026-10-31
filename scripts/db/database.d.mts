import type { PGlite } from "@electric-sql/pglite";
export function createTestDatabase(options?: { throughMigration?: string }): Promise<{ db: PGlite; migrations: string[] }>;
export function applyDevelopmentSeed(db: PGlite): Promise<void>;
