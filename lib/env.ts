const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const aiProvider = (process.env.AI_PROVIDER ?? "auto").toLowerCase();
const groqApiKey = process.env.GROQ_API_KEY ?? "";
const groqModel =
  process.env.GROQ_MODEL ??
  process.env.GROQ_AI_MODEL ??
  "openai/gpt-oss-20b";
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
  aiProvider,
  groqApiKey,
  groqModel,
  googleAiApiKey,
  googleAiModel,
  hasPublicAppUrl: Boolean(publicAppUrl),
  hasSupabaseClientEnv: Boolean(supabaseUrl && supabaseAnonKey),
  hasSupabaseAdminEnv: Boolean(supabaseUrl && supabaseServiceRoleKey),
  hasGroqEnv: Boolean(groqApiKey),
  hasGoogleAiEnv: Boolean(googleAiApiKey),
};
