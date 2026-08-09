import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const hash = async (value: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Methode nicht erlaubt.' }, { status: 405, headers: corsHeaders })

  try {
    const { identifier, code, password } = await request.json()
    const value = typeof identifier === 'string' ? identifier.trim().toLowerCase() : ''
    const isEmail = /^\S+@\S+\.\S+$/.test(value)
    const isUsername = /^[a-z0-9._-]{3,32}$/.test(value)
    if ((!isEmail && !isUsername) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return Response.json({ error: 'Bitte gib deinen Zugang und den sechsstelligen Code ein.' }, { status: 400, headers: corsHeaders })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return Response.json({ error: 'Das neue Passwort muss mindestens 8 Zeichen haben.' }, { status: 400, headers: corsHeaders })
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const profileQuery = admin
      .from('profiles')
      .select('id')
    const { data: profile } = isEmail
      ? await profileQuery.eq('login_email', value).maybeSingle()
      : await profileQuery.ilike('username', value).maybeSingle()
    if (!profile) return Response.json({ error: 'Code oder Zugang ist nicht korrekt.' }, { status: 400, headers: corsHeaders })

    const { data: record } = await admin.from('password_reset_codes').select('code_hash,expires_at,attempts').eq('user_id', profile.id).maybeSingle()
    if (!record || new Date(record.expires_at) < new Date() || record.attempts >= 5) {
      return Response.json({ error: 'Der Code ist abgelaufen. Bitte fordere einen neuen an.' }, { status: 400, headers: corsHeaders })
    }
    if (await hash(code) !== record.code_hash) {
      await admin.from('password_reset_codes').update({ attempts: record.attempts + 1 }).eq('user_id', profile.id)
      return Response.json({ error: 'Code oder Zugang ist nicht korrekt.' }, { status: 400, headers: corsHeaders })
    }

    const { error: authError } = await admin.auth.admin.updateUserById(profile.id, { password })
    if (authError) return Response.json({ error: 'Das Passwort konnte nicht gespeichert werden.' }, { status: 500, headers: corsHeaders })
    await admin.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
    await admin.from('password_reset_codes').delete().eq('user_id', profile.id)
    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch {
    return Response.json({ error: 'Passwort konnte nicht zurückgesetzt werden.' }, { status: 400, headers: corsHeaders })
  }
})
