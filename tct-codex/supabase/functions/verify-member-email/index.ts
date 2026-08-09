import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { email, code } = await request.json()
    if (typeof email !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) return Response.json({ error: 'Bitte gib den sechsstelligen Code ein.' }, { headers: cors })
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await admin.from('profiles').select('id').eq('login_email', email.trim().toLowerCase()).maybeSingle()
    if (!profile) return Response.json({ error: 'Kein Konto zu dieser E-Mail gefunden.' }, { headers: cors })
    const { data: record } = await admin.from('member_email_verifications').select('code_hash,expires_at,attempts').eq('user_id', profile.id).maybeSingle()
    if (!record || new Date(record.expires_at) < new Date() || record.attempts >= 5) return Response.json({ error: 'Der Code ist abgelaufen. Bitte registriere dich erneut.' }, { headers: cors })
    if (await hash(code) !== record.code_hash) {
      await admin.from('member_email_verifications').update({ attempts: record.attempts + 1 }).eq('user_id', profile.id)
      return Response.json({ error: 'Der Code ist nicht korrekt.' }, { headers: cors })
    }
    await admin.from('profiles').update({ email_verified: true }).eq('id', profile.id)
    await admin.from('member_email_verifications').delete().eq('user_id', profile.id)
    return Response.json({ ok: true }, { headers: cors })
  } catch { return Response.json({ error: 'Code konnte nicht geprüft werden.' }, { headers: cors }) }
})
