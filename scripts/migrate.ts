import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { z } from 'zod';

const databaseUrl = z.string().min(1).parse(process.env.DATABASE_URL);
const pool = new Pool({ connectionString: databaseUrl });

async function main(): Promise<void> {
  const directory = resolve('src/database/migrations');
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (applied.rowCount === 0) {
        await client.query(await readFile(resolve(directory, name), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        console.log(`Applied ${name}`);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => pool.end());
