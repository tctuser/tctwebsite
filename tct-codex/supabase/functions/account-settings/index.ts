import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const emailPattern = /^\S+@\S+\.\S+$/
const usernamePattern = /^[a-z0-9._-]{3,32}$/

const hash = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const accountEmailHtml = (displayName: string, code: string, newEmail: string) => `<!doctype html>
<html lang="de"><body style="margin:0;background:#dfe2d8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#eef0e9">
<tr><td style="padding:28px 38px;background:#153824"><img src="https://tennisclub-trier.de/wp-content/uploads/2019/07/TCT.jpg" width="92" alt="Tennisclub Trier" style="display:block"><p style="margin:12px 0 0;color:#c6e24f;font-size:11px;letter-spacing:3px">SEIT 1888</p></td></tr>
<tr><td align="center" style="padding:11px;background:#c6e24f;color:#153824;font-weight:bold;font-size:12px;letter-spacing:3px">TENNIS · PADEL · GEMEINSCHAFT · TRADITION</td></tr>
<tr><td style="padding:42px 54px"><p style="margin:0;color:#5f7a4a;font-size:11px;letter-spacing:3px">— E-MAIL ÄNDERN</p><h1 style="margin:18px 0;color:#153824;font:600 44px/1 Georgia,serif">Neue Adresse<br><i>bestätigen.</i></h1><p style="color:#4c4f47;line-height:1.6">Hallo ${displayName || 'TCT-Mitglied'}, mit diesem Code bestätigst du <strong>${newEmail}</strong> als neue E-Mail-Adresse für dein TCT-Konto.</p><div style="margin:30px 0;padding:28px;background:#153824;color:#c6e24f;text-align:center;font:700 42px monospace;letter-spacing:12px">${code}</div><p style="color:#676d63;line-height:1.6">Der Code ist 15 Minuten gültig. Falls du diese Änderung nicht angefordert hast, ignoriere diese Nachricht und ändere vorsichtshalber dein Passwort.</p></td></tr>
<tr><td style="padding:28px 38px;background:#153824;color:#9fb0a2;font-size:12px">Tennisclub Trier 1888 e.V.<br><span style="color:#c6e24f">HIER SPIELT TRIER</span></td></tr>
</table></td></tr></table></body></html>`

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await client.auth.getUser()
    if (!user) return Response.json({ error: 'Bitte melde dich erneut an.' }, { status: 401, headers: corsHeaders })

    const body = await request.json()
    const action = typeof body.action === 'string' ? body.action : ''
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await admin.from('profiles').select('id,display_name,username,login_email,role,email_verified').eq('id', user.id).maybeSingle()
    if (!profile) return Response.json({ error: 'Mitgliederprofil nicht gefunden.' }, { status: 404, headers: corsHeaders })

    const audit = async (beforeData: Record<string, unknown>, afterData: Record<string, unknown>) => {
      await admin.from('audit_log').insert({
        actor_id: user.id,
        actor_email: profile.login_email ?? user.email,
        action: 'UPDATE',
        table_name: 'profiles',
        row_id: user.id,
        before_data: beforeData,
        after_data: afterData,
      })
    }

    const verifyPassword = async (password: unknown) => {
      const email = String(profile.login_email ?? user.email ?? '').trim().toLowerCase()
      if (!email || typeof password !== 'string' || !password) return false
      const verifier = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await verifier.auth.signInWithPassword({ email, password })
      return !error && data.user?.id === user.id
    }

    if (action === 'changeUsername') {
      const username = String(body.username ?? '').trim().toLowerCase()
      if (!usernamePattern.test(username)) return Response.json({ error: 'Der Benutzername braucht 3 bis 32 Zeichen und darf nur Buchstaben, Zahlen, Punkt, Minus und Unterstrich enthalten.' }, { status: 400, headers: corsHeaders })
      if (username === String(profile.username ?? '').toLowerCase()) return Response.json({ ok: true, username }, { headers: corsHeaders })
      const { data: existing } = await admin.from('profiles').select('id').ilike('username', username).neq('id', user.id).maybeSingle()
      if (existing) return Response.json({ error: 'Dieser Benutzername ist bereits vergeben.' }, { status: 409, headers: corsHeaders })
      const { error } = await admin.from('profiles').update({ username }).eq('id', user.id)
      if (error) return Response.json({ error: 'Benutzername konnte nicht gespeichert werden.' }, { status: 400, headers: corsHeaders })
      await audit({ username: profile.username }, { username })
      return Response.json({ ok: true, username }, { headers: corsHeaders })
    }

    if (action === 'requestEmailChange') {
      const newEmail = String(body.newEmail ?? '').trim().toLowerCase()
      if (!emailPattern.test(newEmail) || newEmail.endsWith('@tct-intern.invalid')) return Response.json({ error: 'Bitte gib eine gültige neue E-Mail-Adresse ein.' }, { status: 400, headers: corsHeaders })
      if (!(await verifyPassword(body.currentPassword))) return Response.json({ error: 'Das aktuelle Passwort ist nicht korrekt.' }, { status: 403, headers: corsHeaders })
      if (newEmail === String(profile.login_email ?? '').toLowerCase()) return Response.json({ error: 'Das ist bereits deine aktuelle E-Mail-Adresse.' }, { status: 400, headers: corsHeaders })
      const { data: existing } = await admin.from('profiles').select('id').ilike('login_email', newEmail).neq('id', user.id).maybeSingle()
      if (existing) return Response.json({ error: 'Diese E-Mail-Adresse wird bereits verwendet.' }, { status: 409, headers: corsHeaders })
      const { data: previous } = await admin.from('account_email_changes').select('requested_at').eq('user_id', user.id).maybeSingle()
      if (previous?.requested_at && Date.now() - new Date(previous.requested_at).getTime() < 60_000) return Response.json({ error: 'Bitte warte eine Minute, bevor du einen neuen Code anforderst.' }, { status: 429, headers: corsHeaders })

      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
      const { error: codeError } = await admin.from('account_email_changes').upsert({ user_id: user.id, new_email: newEmail, code_hash: await hash(code), expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), attempts: 0, requested_at: new Date().toISOString() })
      if (codeError) return Response.json({ error: 'Bestätigungscode konnte nicht erstellt werden.' }, { status: 500, headers: corsHeaders })

      const key = Deno.env.get('BREVO_API_KEY')
      const from = Deno.env.get('BOOKING_FROM_EMAIL')
      if (!key || !from) {
        await admin.from('account_email_changes').delete().eq('user_id', user.id)
        return Response.json({ error: 'E-Mail-Versand ist noch nicht eingerichtet.' }, { status: 500, headers: corsHeaders })
      }
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: { name: 'Tennisclub Trier 1888', email: from }, to: [{ email: newEmail }], subject: 'Neue E-Mail-Adresse bestätigen · Tennisclub Trier', htmlContent: accountEmailHtml(profile.display_name ?? '', code, newEmail), textContent: `Dein TCT-Bestätigungscode lautet ${code}. Er ist 15 Minuten gültig.` }),
      })
      if (!response.ok) {
        await admin.from('account_email_changes').delete().eq('user_id', user.id)
        return Response.json({ error: 'Bestätigungs-E-Mail konnte nicht versendet werden.' }, { status: 502, headers: corsHeaders })
      }
      return Response.json({ ok: true, newEmail }, { headers: corsHeaders })
    }

    if (action === 'confirmEmailChange') {
      const code = String(body.code ?? '').trim()
      if (!/^\d{6}$/.test(code)) return Response.json({ error: 'Bitte gib den sechsstelligen Code ein.' }, { status: 400, headers: corsHeaders })
      const { data: pending } = await admin.from('account_email_changes').select('new_email,code_hash,expires_at,attempts').eq('user_id', user.id).maybeSingle()
      if (!pending || new Date(pending.expires_at).getTime() < Date.now() || pending.attempts >= 5) return Response.json({ error: 'Der Code ist abgelaufen. Bitte fordere einen neuen an.' }, { status: 400, headers: corsHeaders })
      if (await hash(code) !== pending.code_hash) {
        await admin.from('account_email_changes').update({ attempts: pending.attempts + 1 }).eq('user_id', user.id)
        return Response.json({ error: 'Der Code ist nicht korrekt.' }, { status: 400, headers: corsHeaders })
      }
      const oldEmail = String(profile.login_email ?? user.email ?? '')
      const { error: authError } = await admin.auth.admin.updateUserById(user.id, { email: pending.new_email, email_confirm: true })
      if (authError) return Response.json({ error: authError.message.includes('already') ? 'Diese E-Mail-Adresse wird bereits verwendet.' : 'E-Mail-Adresse konnte nicht geändert werden.' }, { status: 400, headers: corsHeaders })
      const { error: profileError } = await admin.from('profiles').update({ login_email: pending.new_email, email_verified: true }).eq('id', user.id)
      if (profileError) {
        await admin.auth.admin.updateUserById(user.id, { email: oldEmail, email_confirm: true })
        return Response.json({ error: 'E-Mail-Adresse konnte nicht im Profil gespeichert werden.' }, { status: 500, headers: corsHeaders })
      }
      await admin.from('account_email_changes').delete().eq('user_id', user.id)
      await audit({ login_email: oldEmail }, { login_email: pending.new_email })
      return Response.json({ ok: true, email: pending.new_email }, { headers: corsHeaders })
    }

    if (action === 'changePassword') {
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
      if (newPassword.length < 10) return Response.json({ error: 'Das neue Passwort muss mindestens 10 Zeichen lang sein.' }, { status: 400, headers: corsHeaders })
      if (!(await verifyPassword(body.currentPassword))) return Response.json({ error: 'Das aktuelle Passwort ist nicht korrekt.' }, { status: 403, headers: corsHeaders })
      if (body.currentPassword === newPassword) return Response.json({ error: 'Das neue Passwort muss sich vom aktuellen unterscheiden.' }, { status: 400, headers: corsHeaders })
      const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
      if (error) return Response.json({ error: 'Passwort konnte nicht geändert werden.' }, { status: 400, headers: corsHeaders })
      await admin.from('profiles').update({ must_change_password: false }).eq('id', user.id)
      await audit({ password_changed: false }, { password_changed: true })
      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    return Response.json({ error: 'Unbekannte Aktion.' }, { status: 400, headers: corsHeaders })
  } catch {
    return Response.json({ error: 'Kontoeinstellungen konnten nicht verarbeitet werden.' }, { status: 500, headers: corsHeaders })
  }
})
