const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.njqmyegvczsnajratjnp:Afrafadhma290208@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
});

const sql = `
-- 1. Create the traffic_logs table
CREATE TABLE IF NOT EXISTS public.traffic_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.traffic_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow anyone to INSERT (anonymous tracking)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.traffic_logs;
CREATE POLICY "Allow anonymous inserts"
ON public.traffic_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- 4. Create a policy to allow reading (for dashboard)
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.traffic_logs;
CREATE POLICY "Allow anonymous reads"
ON public.traffic_logs
FOR SELECT
TO anon
USING (true);

-- 5. Enable Realtime on the traffic_logs table
-- Check if publication exists before trying to add
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'traffic_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.traffic_logs;
  END IF;
END $$;
`;

async function setup() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');
    
    await client.query(sql);
    console.log('Successfully created tables, RLS policies, and enabled Realtime!');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

setup();
