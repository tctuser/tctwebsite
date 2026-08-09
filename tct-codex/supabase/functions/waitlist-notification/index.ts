import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const waitlistHtml = (court: string, startsAt: string) => {
  const date = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(startsAt))
  const time = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(startsAt))
  return '<!doctype html><html lang="de"><body style="margin:0;background:#e9e5da"><table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#f8f6f0"><tr><td style="padding:24px 28px;background:#0b3025;color:#f8f6f0;font:700 12px Arial,sans-serif;letter-spacing:2.6px">TCT <span style="color:#c9f85a">/</span> TENNISCLUB TRIER 1888</td></tr><tr><td style="padding:31px 28px;background:#0b3025"><p style="margin:0 0 18px;color:#c9f85a;font:700 10px Arial,sans-serif;letter-spacing:1.8px">WARTELISTE</p><h1 style="margin:0;color:#f8f6f0;font:700 47px/.88 Georgia,serif;letter-spacing:-2px">Ein Platz<br><i>wurde frei.</i></h1></td></tr><tr><td style="padding:30px 28px"><p style="margin:0;color:#4c4f47;font:16px/1.65 Arial,sans-serif">Für deinen gewünschten Termin ist gerade ein Platz frei geworden. Buche schnell, solange der Zeitraum verfügbar ist.</p><table width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;border-top:1px solid #cdd5cb;border-bottom:1px solid #cdd5cb"><tr><td style="padding:18px 0;color:#0b3025;font:700 19px Georgia,serif">' + court + '</td><td align="right" style="padding:18px 0;color:#0b3025;font:700 14px Arial,sans-serif">' + date + '<br>' + time + ' Uhr</td></tr></table><a href="https://tctrier.vercel.app/booking" style="display:inline-block;padding:15px 22px;background:#d8f34c;color:#0b3025;font:700 11px Arial,sans-serif;letter-spacing:1.3px;text-decoration:none">JETZT BUCHEN →</a></td></tr><tr><td style="padding:22px 28px;background:#0b3025;color:#b7c6bc;font:12px/1.6 Arial,sans-serif">Tennisclub Trier 1888 e.V.<br><span style="color:#c9f85a">Wir sehen uns auf dem Platz.</span></td></tr></table></td></tr></table></body></html>'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    const { bookingId } = await request.json()
    if (!user || typeof bookingId !== 'string') {
      return Response.json({ error: 'Nicht berechtigt.' }, { status: 401, headers: corsHeaders })
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: booking } = await admin
      .from('court_bookings')
      .select('id,user_id,court_id,starts_at,ends_at,status,courts(name)')
      .eq('id', bookingId)
      .maybeSingle()
    if (!booking || booking.user_id !== user.id || booking.status !== 'cancelled') {
      return Response.json({ error: 'Nicht berechtigt.' }, { status: 403, headers: corsHeaders })
    }
    const { data: entry } = await admin
      .from('court_waitlist')
      .select('id,booking_email')
      .eq('court_id', booking.court_id)
      .eq('starts_at', booking.starts_at)
      .eq('ends_at', booking.ends_at)
      .is('notified_at', null)
      .order('created_at')
      .limit(1)
      .maybeSingle()
    if (!entry) return Response.json({ ok: true, notified: false }, { headers: corsHeaders })

    const court = Array.isArray(booking.courts) ? booking.courts[0] : booking.courts
    const brevoKey = Deno.env.get('BREVO_API_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('BOOKING_FROM_EMAIL')
    if (!from || (!brevoKey && !resendKey)) return Response.json({ ok: true, notified: false }, { headers: corsHeaders })
    const response = brevoKey
      ? await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: { name: 'Tennisclub Trier 1888', email: from }, to: [{ email: entry.booking_email }], subject: 'TCT Warteliste – ein Platz ist frei', htmlContent: waitlistHtml(court?.name ?? 'TCT Platz', booking.starts_at), textContent: 'Ein Platz ist frei: ' + (court?.name ?? 'TCT Platz') + '. Buche jetzt über die TCT-Website.' }),
        })
      : await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [entry.booking_email], subject: 'TCT Warteliste – ein Platz ist frei', html: waitlistHtml(court?.name ?? 'TCT Platz', booking.starts_at), text: 'Ein Platz ist frei: ' + (court?.name ?? 'TCT Platz') + '. Buche jetzt über die TCT-Website.' }),
        })
    if (!response.ok) return Response.json({ ok: true, notified: false }, { headers: corsHeaders })
    await admin.from('court_waitlist').update({ notified_at: new Date().toISOString() }).eq('id', entry.id)
    return Response.json({ ok: true, notified: true }, { headers: corsHeaders })
  } catch {
    return Response.json({ error: 'Warteliste konnte nicht benachrichtigt werden.' }, { status: 400, headers: corsHeaders })
  }
})
