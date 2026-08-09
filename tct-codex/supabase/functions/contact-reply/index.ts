import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] ?? character))

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    const { contactMessageId, message } = await request.json()
    if (!user || typeof contactMessageId !== 'string' || typeof message !== 'string' || message.trim().length < 2 || message.length > 5000) {
      return Response.json({ error: 'Bitte gib eine gültige Antwort ein.' }, { status: 400, headers: corsHeaders })
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!profile || !['management', 'admin', 'editor'].includes(profile.role)) {
      return Response.json({ error: 'Du darfst das Kontakt-Postfach nicht verwenden.' }, { status: 403, headers: corsHeaders })
    }
    const { data: inquiry } = await admin.from('contact_messages').select('id,name,email').eq('id', contactMessageId).maybeSingle()
    if (!inquiry) return Response.json({ error: 'Diese Anfrage wurde nicht gefunden.' }, { status: 404, headers: corsHeaders })

    const from = Deno.env.get('BOOKING_FROM_EMAIL')
    const brevoKey = Deno.env.get('BREVO_API_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!from || (!brevoKey && !resendKey)) return Response.json({ error: 'Der E-Mail-Versand ist noch nicht eingerichtet.' }, { status: 503, headers: corsHeaders })

    const text = message.trim()
    const html = '<!doctype html><html lang="de"><body style="margin:0;background:#e9e5da"><table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#f8f6f0"><tr><td style="padding:24px 28px;background:#0b3025;color:#f8f6f0;font:700 12px Arial,sans-serif;letter-spacing:2.6px">TCT <span style="color:#c9f85a">/</span> TENNISCLUB TRIER 1888</td></tr><tr><td style="padding:31px 28px;background:#0b3025"><p style="margin:0;color:#c9f85a;font:700 10px Arial,sans-serif;letter-spacing:1.8px">ANTWORT AUF DEINE ANFRAGE</p><h1 style="margin:16px 0 0;color:#f8f6f0;font:700 43px/.92 Georgia,serif;letter-spacing:-1.7px">Hallo ' + escapeHtml(inquiry.name) + '.</h1></td></tr><tr><td style="padding:34px 28px;color:#36423b;font:16px/1.7 Arial,sans-serif;white-space:pre-line">' + escapeHtml(text) + '</td></tr><tr><td style="padding:22px 28px;background:#0b3025;color:#b7c6bc;font:12px/1.6 Arial,sans-serif">Tennisclub Trier 1888 e.V.<br><span style="color:#c9f85a">Hier spielt Trier.</span></td></tr></table></td></tr></table></body></html>'
    const response = brevoKey
      ? await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: { name: 'Tennisclub Trier 1888', email: from }, to: [{ email: inquiry.email }], subject: 'Antwort auf deine Anfrage beim Tennisclub Trier', textContent: 'Hallo ' + inquiry.name + ',\n\n' + text + '\n\nTennisclub Trier 1888 e.V.', htmlContent: html }) })
      : await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [inquiry.email], subject: 'Antwort auf deine Anfrage beim Tennisclub Trier', text: 'Hallo ' + inquiry.name + ',\n\n' + text + '\n\nTennisclub Trier 1888 e.V.', html }) })
    if (!response.ok) return Response.json({ error: 'Die E-Mail konnte nicht versendet werden.' }, { status: 502, headers: corsHeaders })
    await admin.from('contact_messages').update({ status: 'read' }).eq('id', inquiry.id)
    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch {
    return Response.json({ error: 'Antwort konnte nicht versendet werden.' }, { status: 400, headers: corsHeaders })
  }
})
