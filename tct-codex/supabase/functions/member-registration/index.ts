import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const usernameSeed = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9._-]+/g, '').slice(0, 28)

const usernameFromName = (displayName: string) => {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return usernameSeed(`${parts[0][0]}.${parts.at(-1)}`)
  return usernameSeed(parts[0] ?? '')
}

const uniqueUsername = async (admin: ReturnType<typeof createClient>, requested: string, displayName: string, email: string) => {
  const base = usernameSeed(requested) || usernameFromName(displayName) || usernameSeed(email.split('@')[0])
  if (!/^[a-z0-9._-]{3,32}$/.test(base)) return null
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix ? `${base.slice(0, 32 - String(suffix + 1).length)}${suffix + 1}` : base
    const { data } = await admin.from('profiles').select('id').ilike('username', candidate).maybeSingle()
    if (!data) return candidate
  }
  return null
}
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Methode nicht erlaubt.' }, { status: 405, headers: corsHeaders })

  try {
    const body = await request.json()
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 100) : ''
    const requestedUsername = typeof body.username === 'string' ? body.username.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!displayName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6)
      return Response.json({ error: 'Bitte Name, gültige E-Mail-Adresse und ein Passwort mit mindestens 6 Zeichen eingeben.' }, { status: 400, headers: corsHeaders })
    if (requestedUsername && !/^[A-Za-z0-9._-]{3,32}$/.test(requestedUsername))
      return Response.json({ error: 'Der Benutzername darf 3–32 Zeichen sowie Punkt, Unterstrich oder Bindestrich enthalten.' }, { status: 400, headers: corsHeaders })

    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const username = await uniqueUsername(admin, requestedUsername, displayName, email)
    if (!username) return Response.json({ error: 'Für diesen Namen konnte kein verfügbarer Benutzername erstellt werden.' }, { status: 409, headers: corsHeaders })

    // Public sign-up is created by the server so it stays independent of the
    // provider's outgoing-email limit. It can only ever create a member role.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !data.user)
      return Response.json({ error: error?.message ?? 'Konto konnte nicht erstellt werden.' }, { status: 400, headers: corsHeaders })

    const profile = {
      id: data.user.id,
      display_name: displayName,
      username,
      login_email: email,
      role: 'member',
      email_verified: false,
      must_change_password: false,
      tutorial_completed: true,
    }
    const { error: profileError } = await admin.from('profiles').insert(profile)
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id)
      return Response.json({ error: 'Profil konnte nicht angelegt werden. Bitte versuche es erneut.' }, { status: 500, headers: corsHeaders })
    }

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
    const { error: verificationError } = await admin.from('member_email_verifications').upsert({ user_id: data.user.id, code_hash: await hash(code), expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), attempts: 0 })
    if (verificationError) return Response.json({ error: 'Bestätigungscode konnte nicht erstellt werden.' }, { status: 500, headers: corsHeaders })
    const key = Deno.env.get('BREVO_API_KEY')
    const from = Deno.env.get('BOOKING_FROM_EMAIL')
    if (!key || !from) return Response.json({ error: 'E-Mail-Versand ist noch nicht eingerichtet.' }, { status: 500, headers: corsHeaders })
    const html = `<!doctype html><html lang="de"><body style="margin:0;background:#dfe2d8;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 12px"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#eef0e9"><tr><td style="padding:28px 38px;background:#153824"><img src="https://tennisclub-trier.de/wp-content/uploads/2019/07/TCT.jpg" width="92" alt="Tennisclub Trier" style="display:block"><p style="margin:12px 0 0;color:#c6e24f;font-size:11px;letter-spacing:3px">SEIT 1888</p></td></tr><tr><td align="center" style="padding:11px;background:#c6e24f;color:#153824;font-weight:bold;font-size:12px;letter-spacing:3px">TENNIS · PADEL · GEMEINSCHAFT · TRADITION</td></tr><tr><td style="padding:42px 54px"><p style="margin:0;color:#5f7a4a;font-size:11px;letter-spacing:3px">— E-MAIL BESTÄTIGEN</p><h1 style="margin:18px 0;color:#153824;font:600 46px/1 Georgia,serif">Fast <i>geschafft.</i></h1><p style="color:#4c4f47;line-height:1.6">Willkommen beim TC Trier, ${displayName}. Gib diesen Code ein, um dein Konto zu aktivieren.</p><div style="margin:30px 0;padding:28px;background:#153824;color:#c6e24f;text-align:center;font:700 42px monospace;letter-spacing:12px">${code}</div><p style="color:#676d63;line-height:1.6">Der Code ist 15 Minuten gültig. Gib ihn niemals an Dritte weiter.</p></td></tr><tr><td style="padding:28px 38px;background:#153824;color:#9fb0a2;font-size:12px">Tennisclub Trier 1888 e.V.<br><span style="color:#c6e24f">HIER SPIELT TRIER</span></td></tr></table></td></tr></table></body></html>`
    const response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: { name: 'Tennisclub Trier 1888', email: from }, to: [{ email }], subject: 'E-Mail bestätigen · Tennisclub Trier', htmlContent: html, textContent: `Dein Bestätigungscode lautet ${code}. Er ist 15 Minuten gültig.` }) })
    if (!response.ok) return Response.json({ error: 'Bestätigungs-E-Mail konnte nicht versendet werden.' }, { status: 502, headers: corsHeaders })

    return Response.json({ ok: true, username, needsEmailConfirmation: true }, { headers: corsHeaders })
  } catch {
    return Response.json({ error: 'Die Registrierung konnte nicht verarbeitet werden.' }, { status: 400, headers: corsHeaders })
  }
})
