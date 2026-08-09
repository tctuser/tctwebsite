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

const resetEmailHtml = (code: string) =>
  '<!doctype html><html lang="de"><body style="margin:0;padding:0;background:#e9e5da"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e9e5da;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#f8f6f0;color:#0b3025"><tr><td style="padding:24px 28px;background:#0b3025;color:#f8f6f0;font:700 12px Arial,sans-serif;letter-spacing:2.6px">TCT <span style="color:#c9f85a">/</span> TENNISCLUB TRIER 1888</td></tr><tr><td style="padding:31px 28px 0;background:#0b3025"><p style="margin:0 0 18px;color:#c9f85a;font:700 10px Arial,sans-serif;letter-spacing:1.8px">PASSWORT ZURÜCKSETZEN</p><h1 style="margin:0;color:#f8f6f0;font:700 47px/.88 Georgia,serif;letter-spacing:-2px">Neues<br><i>Passwort.</i></h1></td></tr><tr><td style="padding:30px 28px 0;background:#0b3025"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#174535;border:1px solid rgba(248,246,240,.7)"><tr><td style="padding:13px;border-right:1px solid rgba(248,246,240,.7);border-bottom:1px solid rgba(248,246,240,.7);height:66px"></td><td style="padding:13px;border-bottom:1px solid rgba(248,246,240,.7);height:66px"></td></tr><tr><td colspan="2" style="padding:13px;text-align:center;color:#c9f85a;font:700 10px Arial,sans-serif;letter-spacing:1.5px">DEIN TCT-ZUGANG</td></tr><tr><td style="padding:13px;border-right:1px solid rgba(248,246,240,.7);border-top:1px solid rgba(248,246,240,.7);height:66px"></td><td style="padding:13px;border-top:1px solid rgba(248,246,240,.7);height:66px"></td></tr></table></td></tr><tr><td style="padding:30px 28px"><p style="margin:0;color:#4c4f47;font:16px/1.6 Arial,sans-serif">Du hast ein neues Passwort angefordert. Gib diesen sechsstelligen Code auf der TCT-Website ein:</p><div style="margin:25px 0;padding:23px 18px;background:#d8f34c;color:#0b3025;text-align:center;font:700 34px/1 monospace;letter-spacing:10px">' + code + '</div><p style="margin:0;color:#667168;font:13px/1.65 Arial,sans-serif">Der Code ist 15 Minuten gültig und kann nur einmal verwendet werden. Wenn du kein neues Passwort angefordert hast, ignoriere diese E-Mail – dein bisheriges Passwort bleibt gültig.</p></td></tr><tr><td style="padding:22px 28px;background:#0b3025;color:#b7c6bc;font:12px/1.6 Arial,sans-serif">Tennisclub Trier 1888 e.V.<br><span style="color:#c9f85a">Wir sehen uns auf dem Platz.</span></td></tr></table></td></tr></table></body></html>'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Methode nicht erlaubt.' }, { status: 405, headers: corsHeaders })

  const generic = { ok: true, message: 'Wenn ein passender Zugang existiert, wurde ein Code versendet.' }
  try {
    const { identifier } = await request.json()
    const value = typeof identifier === 'string' ? identifier.trim().toLowerCase() : ''
    const isEmail = /^\S+@\S+\.\S+$/.test(value)
    const isUsername = /^[a-z0-9._-]{3,32}$/.test(value)
    if (!isEmail && !isUsername) return Response.json(generic, { headers: corsHeaders })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const profileQuery = admin
      .from('profiles')
      .select('id,login_email')
    const { data: profile } = isEmail
      ? await profileQuery.eq('login_email', value).maybeSingle()
      : await profileQuery.ilike('username', value).maybeSingle()
    const email = profile?.login_email?.trim().toLowerCase()
    if (!profile || !email || email.endsWith('@tct-intern.invalid')) return Response.json(generic, { headers: corsHeaders })

    const { data: previous } = await admin.from('password_reset_codes').select('requested_at').eq('user_id', profile.id).maybeSingle()
    if (previous && Date.now() - new Date(previous.requested_at).getTime() < 60_000) {
      return Response.json({ ...generic, waitSeconds: 60 }, { headers: corsHeaders })
    }

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
    await admin.from('password_reset_codes').upsert({
      user_id: profile.id,
      code_hash: await hash(code),
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      attempts: 0,
      requested_at: new Date().toISOString(),
    })

    const brevoKey = Deno.env.get('BREVO_API_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('BOOKING_FROM_EMAIL')
    if ((!brevoKey && !resendKey) || !from) return Response.json(generic, { headers: corsHeaders })
    const response = brevoKey
      ? await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: { name: 'Tennisclub Trier 1888', email: from }, to: [{ email }], subject: 'Dein TCT-Code für ein neues Passwort', htmlContent: resetEmailHtml(code), textContent: 'Dein TCT-Code lautet ' + code + '. Er ist 15 Minuten gültig.' }),
        })
      : await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [email], subject: 'Dein TCT-Code für ein neues Passwort', html: resetEmailHtml(code), text: 'Dein TCT-Code lautet ' + code + '. Er ist 15 Minuten gültig.' }),
        })
    if (!response.ok) console.error('Password reset mail provider rejected the request.')
  } catch {
    // Keep the same answer so an attacker cannot discover existing accounts.
  }
  return Response.json(generic, { headers: corsHeaders })
})
