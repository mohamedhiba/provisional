const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  publicAppUrl,
  supabaseServiceRoleKey,
  hasPublicAppUrl: Boolean(publicAppUrl),
  hasSupabaseClientEnv: Boolean(supabaseUrl && supabaseAnonKey),
  hasSupabaseAdminEnv: Boolean(supabaseUrl && supabaseServiceRoleKey),
};
