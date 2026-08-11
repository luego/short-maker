import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

// Ensure data directory exists for SQLite file
const dbDir = path.resolve('.', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const client = createClient({ url: process.env.DB_FILE_NAME! });
export const db = drizzle({ client });