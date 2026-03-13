const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const googleAiApiKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
  process.env.GEMINI_API_KEY ??
  "";
const googleAiModel =
  process.env.GOOGLE_GENERATIVE_AI_MODEL ??
  process.env.GEMINI_MODEL ??
  "gemini-2.5-flash-lite";

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  publicAppUrl,
  supabaseServiceRoleKey,
  googleAiApiKey,
  googleAiModel,
  hasPublicAppUrl: Boolean(publicAppUrl),
  hasSupabaseClientEnv: Boolean(supabaseUrl && supabaseAnonKey),
  hasSupabaseAdminEnv: Boolean(supabaseUrl && supabaseServiceRoleKey),
  hasGoogleAiEnv: Boolean(googleAiApiKey),
};
