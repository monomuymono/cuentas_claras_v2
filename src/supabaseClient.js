// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Leemos las variables desde el entorno
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
