import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { username, password } = await request.json()
  if (typeof username !== 'string' || !/^[A-Za-z0-9._-]{3,32}$/.test(username)) return Response.json({ error: 'Ungültige Anmeldedaten.' }, { status: 400, headers: corsHeaders })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data } = await admin.from('profiles').select('login_email').ilike('username', username).maybeSingle()
  if (!data?.login_email) return Response.json({ error: 'Ungültige Anmeldedaten.' }, { status: 401, headers: corsHeaders })
  const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data: signIn, error } = await auth.auth.signInWithPassword({ email: data.login_email, password })
  if (error || !signIn.session) return Response.json({ error: 'Invalid login.' }, { status: 401, headers: corsHeaders })
  return Response.json({ session: signIn.session }, { headers: corsHeaders })
})
