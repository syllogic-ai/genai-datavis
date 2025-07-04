import { createClient } from '@supabase/supabase-js';
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testRealtime() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔍 Testing Supabase Realtime for jobs table...\n');

  // Check if realtime is enabled for jobs table
  const { data: tables, error } = await supabase
    .from('jobs')
    .select('id')
    .limit(1);

  if (error) {
    console.error('❌ Error accessing jobs table:', error);
    return;
  }

  console.log('✅ Jobs table is accessible\n');

  // Subscribe to changes
  console.log('📡 Setting up realtime subscription...');
  
  const channel = supabase
    .channel('test-jobs-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'jobs'
      },
      (payload) => {
        console.log('\n🎉 Realtime event received!');
        console.log('Event type:', payload.eventType);
        console.log('Payload:', JSON.stringify(payload, null, 2));
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to jobs table changes\n');
        console.log('👀 Waiting for changes... (update a job in your database to see events)');
        console.log('Press Ctrl+C to exit\n');
      }
    });

  // Keep the script running
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Unsubscribing from realtime...');
    channel.unsubscribe();
    process.exit(0);
  });
}

testRealtime().catch(console.error);