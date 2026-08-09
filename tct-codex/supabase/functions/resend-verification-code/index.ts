import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('')

// Neuer Code für ein noch unbestätigtes Konto — nötig, weil der ursprüngliche
// Code nach 15 Minuten abläuft und es sonst keinen Weg zurück ins Konto gab
// (Registrierung schlägt dann mit "E-Mail bereits vergeben" fehl, Login
// bleibt an der Verify-Maske hängen, ohne einen neuen Code anzubieten).
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Methode nicht erlaubt.' }, { status: 405, headers: corsHeaders })

  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!/^\S+@\S+\.\S+$/.test(email))
      return Response.json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, { status: 400, headers: corsHeaders })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: profile } = await admin
      .from('profiles')
      .select('id, display_name, email_verified')
      .eq('login_email', email)
      .maybeSingle()
    if (!profile)
      return Response.json({ error: 'Kein Konto zu dieser E-Mail gefunden.' }, { status: 404, headers: corsHeaders })
    if (profile.email_verified)
      return Response.json({ error: 'Dieses Konto ist bereits bestätigt. Du kannst dich einfach anmelden.' }, { status: 409, headers: corsHeaders })

    const { data: existing } = await admin
      .from('member_email_verifications')
      .select('created_at')
      .eq('user_id', profile.id)
      .maybeSingle()
    if (existing && Date.now() - new Date(existing.created_at).getTime() < 30_000)
      return Response.json({ error: 'Du hast gerade erst einen Code angefordert. Bitte warte kurz und prüfe dein Postfach.' }, { status: 429, headers: corsHeaders })

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
    const { error: upsertError } = await admin.from('member_email_verifications').upsert({
      user_id: profile.id,
      code_hash: await hash(code),
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
    })
    if (upsertError)
      return Response.json({ error: 'Neuer Code konnte nicht erstellt werden.' }, { status: 500, headers: corsHeaders })

    const key = Deno.env.get('BREVO_API_KEY')
    const from = Deno.env.get('BOOKING_FROM_EMAIL')
    if (!key || !from)
      return Response.json({ error: 'E-Mail-Versand ist noch nicht eingerichtet.' }, { status: 500, headers: corsHeaders })

    const html = `<!doctype html><html lang="de"><body style="margin:0;background:#dfe2d8;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 12px"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#eef0e9"><tr><td style="padding:28px 38px;background:#153824"><img src="https://tennisclub-trier.de/wp-content/uploads/2019/07/TCT.jpg" width="92" alt="Tennisclub Trier" style="display:block"><p style="margin:12px 0 0;color:#c6e24f;font-size:11px;letter-spacing:3px">SEIT 1888</p></td></tr><tr><td align="center" style="padding:11px;background:#c6e24f;color:#153824;font-weight:bold;font-size:12px;letter-spacing:3px">TENNIS · PADEL · GEMEINSCHAFT · TRADITION</td></tr><tr><td style="padding:42px 54px"><p style="margin:0;color:#5f7a4a;font-size:11px;letter-spacing:3px">— NEUER BESTÄTIGUNGSCODE</p><h1 style="margin:18px 0;color:#153824;font:600 46px/1 Georgia,serif">Noch <i>einmal.</i></h1><p style="color:#4c4f47;line-height:1.6">Hallo ${profile.display_name ?? ''}, hier ist dein neuer Code, um dein TCT-Konto zu aktivieren.</p><div style="margin:30px 0;padding:28px;background:#153824;color:#c6e24f;text-align:center;font:700 42px monospace;letter-spacing:12px">${code}</div><p style="color:#676d63;line-height:1.6">Der Code ist 15 Minuten gültig. Gib ihn niemals an Dritte weiter.</p></td></tr><tr><td style="padding:28px 38px;background:#153824;color:#9fb0a2;font-size:12px">Tennisclub Trier 1888 e.V.<br><span style="color:#c6e24f">HIER SPIELT TRIER</span></td></tr></table></td></tr></table></body></html>`
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Tennisclub Trier 1888', email: from },
        to: [{ email }],
        subject: 'Neuer Bestätigungscode · Tennisclub Trier',
        htmlContent: html,
        textContent: `Dein neuer Bestätigungscode lautet ${code}. Er ist 15 Minuten gültig.`,
      }),
    })
    if (!response.ok)
      return Response.json({ error: 'Bestätigungs-E-Mail konnte nicht versendet werden.' }, { status: 502, headers: corsHeaders })

    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch {
    return Response.json({ error: 'Der Code konnte nicht neu versendet werden.' }, { status: 400, headers: corsHeaders })
  }
})
