const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  hasSupabaseClientEnv: Boolean(supabaseUrl && supabaseAnonKey),
  hasSupabaseAdminEnv: Boolean(supabaseUrl && supabaseServiceRoleKey),
};
