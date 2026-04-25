import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://euyxxjszmfizlxhotnxv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eXh4anN6bWZpemx4aG90bnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTM4NzMsImV4cCI6MjA5MjU4OTg3M30.aDY5OT-tRGWY78uhCGZi4yEgxV2UL7EuTRmXBH0G5SY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  // invoices テーブル
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .limit(1);

  console.log('=== invoices テーブル ===');
  if (invoices && invoices.length > 0) {
    console.log('カラム:', Object.keys(invoices[0]));
  }

  // clients テーブル
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .limit(1);

  console.log('\n=== clients テーブル ===');
  if (clients && clients.length > 0) {
    console.log('カラム:', Object.keys(clients[0]));
  }

  // settings テーブル
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .limit(1);

  console.log('\n=== settings テーブル ===');
  if (settings && settings.length > 0) {
    console.log('カラム:', Object.keys(settings[0]));
  }
}

checkTables().catch(console.error);
