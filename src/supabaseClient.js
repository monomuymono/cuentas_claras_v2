// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jkkzkywgltqqzebsckar.supabase.co'; // Pega aquí tu URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impra3preXdnbHRxcXplYnNja2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4ODgsImV4cCI6MjA3MTA5OTg4OH0.75bSHyLJLcN7ElgU9kkGeWUtUqWmrWhH8LJh2puU_Bc'; // Pega aquí tu clave anónima

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
