import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsnjgmyhabvoiqcfewqb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzbmpnbXloYWJ2b2lxY2Zld3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjM5OTksImV4cCI6MjA5NDAzOTk5OX0.nAvKzx6bXYUz-bRoeknhP8cLg5AhfOm7kes-jmcz-Yw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Attempting to insert into rooms...');
  const { data, error } = await supabase
    .from('rooms')
    .insert([
      { 
        id: 'KB-TEST', 
        target_score: 3, 
        stake: 1.0, 
        creator_id: 'test_id',
        status: 'WAITING'
      }
    ]);

  if (error) {
    console.error('Insert Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Insert Success:', data);
  }
}

test();
