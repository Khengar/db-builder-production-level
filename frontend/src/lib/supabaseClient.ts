import { createClient } from "@supabase/supabase-js";

const supabaseurl = import.meta.env.VITE_PROJECT_URL
const anon_key = import.meta.env.VITE_ANON_KEY

export const supabaseClient = createClient(supabaseurl, anon_key);