import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Lazy proxy for sql tagged template to prevent build-time crashes when DATABASE_URL is not set
let _sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not defined in environment variables. Please add it to your Vercel Project Settings or .env.local file.'
    );
  }
  if (!_sqlInstance) {
    _sqlInstance = neon(connectionString);
  }
  return _sqlInstance;
}

// Transparent tagged template runner that resolves at call time
export const sql: NeonQueryFunction<false, false> = ((
  strings: TemplateStringsArray | string,
  ...values: unknown[]
) => {
  const runner = getSql();
  if (typeof strings === 'string') {
    return (runner as unknown as (str: string, ...vals: unknown[]) => unknown)(strings, ...values);
  }
  return (runner as unknown as (strs: TemplateStringsArray, ...vals: unknown[]) => unknown)(
    strings,
    ...values
  );
}) as unknown as NeonQueryFunction<false, false>;
