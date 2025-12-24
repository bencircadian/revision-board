import { createClient } from '@supabase/supabase-js'

// These automatically pull the keys we set up in Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
