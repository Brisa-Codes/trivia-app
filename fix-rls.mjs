import { Client } from 'pg';

const connectionString = 'postgres://postgres:dqakIIV57vED*EXi@db.qsnjgmyhabvoiqcfewqb.supabase.co:5432/postgres';

async function disableRLS() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');
    
    await client.query('ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;');
    console.log('Disabled RLS on rooms');
    
    await client.query('ALTER TABLE rounds DISABLE ROW LEVEL SECURITY;');
    console.log('Disabled RLS on rounds');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

disableRLS();
