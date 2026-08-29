import { neon, Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not defined in environment variables.');
}

const connectionString = process.env.DATABASE_URL || '';

// Serverless single-query tagged template (HTTP-based, ultra-fast for edge / lambdas)
export const sql = neon(connectionString);

// Serverless connection pool for transactions and multi-step queries
export const dbPool = new Pool({ connectionString });
