import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Try to describe channels table
const { data, error } = await supabase
  .from('channels')
  .select('*')
  .limit(1);

if (error) {
  console.error('Table channels error:', error.message);
  console.error('Code:', error.code);
  console.error('Details:', error.details);
} else {
  console.log('Table channels exists and is accessible');
  console.log('Sample result:', data);
}

process.exit(0);
