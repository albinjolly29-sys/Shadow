import { createClient } from "@supabase/supabase-js";

// Set these in Vercel → Project → Settings → Environment Variables
// (or in a local .env.local file):
//   NEXT_PUBLIC_SUPABASE_URL      = https://xxxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY = the long "anon public" key
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const BUCKET = "gallery";
export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured ? createClient(url, anonKey) : null;
