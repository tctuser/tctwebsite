import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * This remains null until the local .env.local has the public project values.
 * Secret/service-role keys are deliberately never used by browser code.
 */
export const supabase: SupabaseClient | null = url && publishableKey
  ? createClient(url, publishableKey)
  : null
