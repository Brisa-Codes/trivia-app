import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsnjgmyhabvoiqcfewqb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzbmpnbXloYWJ2b2lxY2Zld3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjM5OTksImV4cCI6MjA5NDAzOTk5OX0.nAvKzx6bXYUz-bRoeknhP8cLg5AhfOm7kes-jmcz-Yw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('rounds').insert([{
    room_id: 'KB-TEST',
    round_number: 1,
    asker_id: 'test_id',
    question: 'Test?',
    options: ['A', 'B', 'C', 'D'],
    correct_option: 'A'
  }]);
  
  console.log("Error:", error);
}
run();
