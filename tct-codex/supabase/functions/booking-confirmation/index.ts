import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] ?? character))

const icsDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace('.000', '')
const icsEscape = (value: string) => value.replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n')
const toBase64 = (value: string) => btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(''))
const selectedTemplate = ({ court, starts, ends, partner, id, cancelled, kind, amount }: { court: string; starts: string; ends: string; partner: string | null; id: string; cancelled: boolean; kind: string; amount: string }) => {
  const date = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(starts))
  const time = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(new Date(starts))
  const end = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(new Date(ends))
  const name = escapeHtml(court), player = escapeHtml(partner || 'Kein Mitspieler angegeben')
  const cal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`TCT · ${court}`)}&dates=${icsDate(starts)}/${icsDate(ends)}`.replace(/&/g, '&amp;')
  const action = cancelled ? `<a href="https://tennisclub-trier.de/booking" style="display:inline-block;padding:15px 28px;background:#c6e24f;color:#153824;font:bold 12px monospace;letter-spacing:2px;text-decoration:none">NEUEN PLATZ BUCHEN →</a>` : `<a href="${cal}" style="display:inline-block;padding:15px 28px;background:#c6e24f;color:#153824;font:bold 12px monospace;letter-spacing:2px;text-decoration:none">ZUM KALENDER HINZUFÜGEN →</a><br><br><a href="https://maps.google.com/?q=Am+Stadion+1+54292+Trier" style="color:#2f5c3c;font:14px Arial,sans-serif">Zur Anlage navigieren →</a>`
  const padel = kind === 'padel' && !cancelled ? `<div style="margin-top:22px;padding:20px;background:#153824;color:#eef0e9;font:14px/1.65 Arial"><b style="color:#c6e24f">PADEL · BITTE ÜBERWEISEN</b><br>Bitte überweise <b>${amount} €</b> an <b>Padelexpert GbR</b><br>IBAN: <b>DE05 5855 0130 0001 0468 20</b><br><br>Schläger, Bälle und den Lichtschlüssel findest du in der Tennishalle auf Platz 1 links hinter dem Vorhang.</div>` : ''
  return `<!doctype html><html lang="de"><body style="margin:0;background:#dfe2d8"><table width="100%" cellpadding="0" cellspacing="0" style="padding:34px 12px"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#eef0e9"><tr><td style="padding:27px 38px;background:#153824"><img src="https://tennisclub-trier.de/wp-content/uploads/2019/07/TCT.jpg" width="112" alt="Tennisclub Trier" style="display:block"><span style="float:right;color:#c6e24f;font:11px monospace;letter-spacing:3px">SEIT 1888</span></td></tr><tr><td align="center" style="padding:11px;background:#c6e24f;color:#153824;font:bold 11px monospace;letter-spacing:3px">TENNIS · PADEL · GEMEINSCHAFT · TRADITION</td></tr><tr><td style="padding:44px 56px"><p style="margin:0;color:#5f7a4a;font:12px monospace;letter-spacing:3px">— ${cancelled ? 'STORNIERUNG' : 'PLATZRESERVIERUNG'}</p><h1 style="margin:18px 0;color:#153824;font:600 48px Georgia,serif">${cancelled ? 'Buchung <i>storniert.</i>' : 'Platz <i>reserviert.</i>'}</h1><p style="color:#4c4f47;font:16px/1.6 Arial">${cancelled ? 'Deine Reservierung wurde storniert. Der Platz ist wieder frei.' : 'Alles klar – dein Platz steht. Hier sind die Details.'}</p><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px;background:#fff;border:1px solid #dfe3d7"><tr><td style="padding:24px 28px;border-bottom:1px solid #eef0e9"><small style="color:#8a9182;font:10px monospace;letter-spacing:2px">PLATZ</small><div style="margin-top:7px;color:#153824;font:600 28px Georgia,serif;${cancelled ? 'text-decoration:line-through;color:#8a9182' : ''}">${name}</div></td></tr><tr><td style="padding:20px 28px;border-bottom:1px solid #eef0e9;color:#22241f;font:16px Arial"><b>${date}</b><br>${time}–${end} Uhr</td></tr><tr><td style="padding:20px 28px;border-bottom:1px solid #eef0e9;color:#22241f;font:16px Arial">Mitspieler: ${player}</td></tr><tr><td style="padding:20px 28px;font:14px monospace">BUCHUNGSNUMMER · ${id.slice(0,8).toUpperCase()}</td></tr></table>${padel}<div style="margin-top:30px">${action}</div></td></tr><tr><td style="padding:32px 38px;background:#153824;color:#9fb0a2;font:12px Arial">Tennisclub Trier 1888 e.V.<br><span style="color:#c6e24f">HIER SPIELT TRIER</span></td></tr></table></td></tr></table></body></html>`
}

const bookingEmailHtml = ({
  courtName,
  kind,
  startsAt,
  endsAt,
  amount,
  isCancellation,
}: {
  courtName: string
  kind: string
  startsAt: string
  endsAt: string
  amount: string
  isCancellation: boolean
}) => {
  const date = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(startsAt))
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(startsAt))
  const endTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(endsAt))
  const safeCourt = escapeHtml(courtName)
  const status = isCancellation ? 'STORNIERT' : 'DEIN COURT IST RESERVIERT'
  const title = isCancellation ? 'Deine Buchung<br><em>wurde storniert.</em>' : 'Spiel.<br><em>bereit.</em>'
  const intro = isCancellation
    ? 'Der Zeitraum ist wieder freigegeben. Wir hoffen, dich bald wieder auf unserer Anlage zu sehen.'
    : 'Deine Spielzeit ist fest für dich reserviert. Wir freuen uns auf dein Match!'
  const payment = kind === 'padel' && !isCancellation
    ? `<tr><td style="padding:18px 26px 0;font:700 11px Arial,sans-serif;color:#c9f85a;letter-spacing:1.4px">PADEL · ZAHLUNGSINFO</td></tr><tr><td style="padding:8px 26px 26px;font:15px/1.65 Arial,sans-serif;color:#edf3e8">Bitte überweise <strong>${amount} €</strong> an Padelexpert GbR<br>IBAN <strong style="letter-spacing:1px">DE05 5855 0130 0001 0468 20</strong><br><span style="color:#b7c6bc">Schläger, Bälle und Lichtschlüssel findest du in der Tennishalle auf Platz 1 links hinter dem Vorhang.</span></td></tr>`
    : ''

  return `<!doctype html><html lang="de"><body style="margin:0;padding:0;background:#e9e5da"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e9e5da;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#f8f6f0;color:#0b3025"><tr><td style="padding:24px 28px;background:#0b3025;color:#f8f6f0;font:700 12px Arial,sans-serif;letter-spacing:2.6px">TCT <span style="color:#c9f85a">/</span> TENNISCLUB TRIER 1888</td></tr><tr><td style="padding:31px 28px 0;background:#0b3025"><p style="margin:0 0 18px;color:#c9f85a;font:700 10px Arial,sans-serif;letter-spacing:1.8px">${status}</p><h1 style="margin:0;color:#f8f6f0;font:700 47px/.88 Georgia,serif;letter-spacing:-2px">${title}</h1></td></tr><tr><td style="padding:30px 28px 0;background:#0b3025"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#174535;border:1px solid rgba(248,246,240,.7)"><tr><td style="padding:13px;border-right:1px solid rgba(248,246,240,.7);border-bottom:1px solid rgba(248,246,240,.7);height:66px"></td><td style="padding:13px;border-bottom:1px solid rgba(248,246,240,.7);height:66px"></td></tr><tr><td colspan="2" style="padding:13px;text-align:center;color:#c9f85a;font:700 10px Arial,sans-serif;letter-spacing:1.5px">${safeCourt.toUpperCase()} · ${kind.toUpperCase()}</td></tr><tr><td style="padding:13px;border-right:1px solid rgba(248,246,240,.7);border-top:1px solid rgba(248,246,240,.7);height:66px"></td><td style="padding:13px;border-top:1px solid rgba(248,246,240,.7);height:66px"></td></tr></table></td></tr><tr><td style="padding:28px;background:#0b3025"><p style="margin:0;color:#edf3e8;font:16px/1.6 Arial,sans-serif">${intro}</p></td></tr><tr><td style="padding:30px 28px 5px"><p style="margin:0;color:#547265;font:700 10px Arial,sans-serif;letter-spacing:1.7px">DEIN TERMIN</p></td></tr><tr><td style="padding:14px 28px 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #cdd5cb;border-bottom:1px solid #cdd5cb"><tr><td style="padding:16px 0;color:#0b3025;font:700 18px Georgia,serif">${date}</td><td align="right" style="padding:16px 0;color:#0b3025;font:700 15px Arial,sans-serif">${time} – ${endTime} Uhr</td></tr></table></td></tr>${!isCancellation ? `<tr><td style="padding:0 28px 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#d8f34c"><tr><td style="padding:17px 18px;color:#0b3025;font:700 10px Arial,sans-serif;letter-spacing:1.3px">${kind === 'padel' ? 'ZAHLUNG NACH DER BUCHUNG' : 'MITGLIEDER‑BUCHUNG'}</td><td align="right" style="padding:17px 18px;color:#0b3025;font:700 18px Georgia,serif">${amount} €</td></tr></table></td></tr>` : ''}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#0b3025">${payment}<tr><td style="padding:22px 28px;color:#b7c6bc;font:12px/1.6 Arial,sans-serif">Tennisclub Trier 1888 e.V.<br><span style="color:#c9f85a">Wir sehen uns auf dem Platz.</span></td></tr></table></td></tr></table></body></html>`
}

const geminiEmailHtml = ({ courtName, startsAt, endsAt, amount, partner, bookingId, isCancellation }: { courtName: string; startsAt: string; endsAt: string; amount: string; partner: string | null; bookingId: string; isCancellation: boolean }) => {
  const dateFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
  const date = dateFormat.format(new Date(startsAt))
  const time = timeFormat.format(new Date(startsAt))
  const endTime = timeFormat.format(new Date(endsAt))
  const court = escapeHtml(courtName)
  const companion = escapeHtml(partner || 'Kein Mitspieler angegeben')
  const id = escapeHtml(bookingId.slice(0, 8).toUpperCase())
  const logo = 'https://tennisclub-trier.de/wp-content/uploads/2019/07/TCT.jpg'
  const maps = 'https://maps.google.com/?q=Am+Stadion+1+54292+Trier'
  const dates = `${new Date(startsAt).toISOString().replace(/[-:]/g, '').replace('.000', '')}/${new Date(endsAt).toISOString().replace(/[-:]/g, '').replace('.000', '')}`
  const calendar = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`TCT · ${courtName}`)}&dates=${dates}&location=${encodeURIComponent('Tennisclub Trier 1888 e.V., Am Stadion 1, 54292 Trier')}`.replace(/&/g, '&amp;')
  const status = isCancellation ? 'Buchung storniert' : '✓ Platzbuchung erfolgreich bestätigt'
  const headline = isCancellation ? 'Deine Buchung wurde storniert.' : 'Dein Match wartet. 👋'
  const intro = isCancellation ? 'Der Zeitraum ist wieder freigegeben. Wir hoffen, dich bald wieder auf unserer Anlage zu sehen.' : 'Dein Platz beim TC Trier ist reserviert. Hier sind alle Details zu deinem bevorstehenden Spiel.'
  const actions = isCancellation ? '' : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td align="center" style="padding:0 4px 8px"><a href="${calendar}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:13px 18px;border-radius:24px;font-weight:bold;font-size:13px">📅 Zum Kalender hinzufügen</a></td><td align="center" style="padding:0 4px 8px"><a href="${maps}" style="display:inline-block;background:#fff;color:#1b4332;border:1px solid #2d6a4f;text-decoration:none;padding:12px 18px;border-radius:24px;font-weight:bold;font-size:13px">📍 Navigieren</a></td></tr></table>`
  const notes = isCancellation
    ? `<p style="margin:0;padding:17px 20px;background:#e9ecef;border-radius:8px;font-size:13px;line-height:1.65"><strong>ℹ Gut zu wissen</strong><br>Falls du erneut spielen möchtest, kannst du dir jederzeit einen freien Zeitraum über dein TCT‑Konto buchen.</p>`
    : `<p style="margin:0;padding:17px 20px;background:#e9ecef;border-radius:8px;font-size:13px;line-height:1.65"><strong>ℹ Hinweise für deinen Besuch</strong><br>• Plätze nur mit geeigneten Tennisschuhen betreten.<br>• Bitte den Platz nach dem Spiel sauber hinterlassen und bei Bedarf abziehen.<br>• Sandplätze bei trockenen Bedingungen vor und nach dem Spiel wässern.<br>• Stornierungen verwaltest du in deinem TCT‑Konto.</p>`
  return `<!doctype html><html lang="de"><body style="margin:0;background:#f4f7f6;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff"><tr><td align="center" style="background:#1b4332;padding:25px 20px"><img src="${logo}" width="72" alt="TCT Tennisclub Trier" style="display:block;border:0;max-width:72px;height:auto;margin:0 auto 10px"><p style="margin:0;color:#d8f3dc;letter-spacing:2px;font-size:12px">TENNISCLUB TRIER 1888</p></td></tr><tr><td align="center" style="background:${isCancellation ? '#7b3b32' : '#2d6a4f'};padding:12px;color:#fff;font-weight:bold">${status}</td></tr><tr><td style="padding:36px 30px;color:#2b2d42"><h2 style="margin:0 0 15px;color:#1b4332">${headline}</h2><p style="line-height:1.6">${intro}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-left:5px solid ${isCancellation ? '#7b3b32' : '#2d6a4f'}"><tr><td style="padding:20px;font-size:15px;line-height:2"><strong>📍 Platz:</strong> ${court}<br><strong>📅 Datum:</strong> ${date}<br><strong>⏰ Uhrzeit:</strong> ${time} – ${endTime} Uhr<br><strong>👥 Mitspieler:</strong> ${companion}<br><strong>🆔 Buchungs-ID:</strong> #${id}<br><strong>💳 Betrag:</strong> ${amount} €</td></tr></table>${actions}<div style="margin-top:22px">${notes}</div></td></tr><tr><td align="center" style="background:#1b4332;padding:24px;color:#d8f3dc;font-size:12px">Tennisclub Trier 1888 e.V.<br><span style="display:inline-block;margin-top:8px;color:#fff">Wir sehen uns auf dem Platz.</span></td></tr></table></td></tr></table></body></html>`
}

void geminiEmailHtml
const comparisonEmailHtml = ({ courtName, startsAt, endsAt, amount, partner, bookingId, style }: { courtName: string; startsAt: string; endsAt: string; amount: string; partner: string | null; bookingId: string; style: 'gemini' | 'claude' }) => {
  const date = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(startsAt))
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(startsAt))
  const endTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(endsAt))
  const court = escapeHtml(courtName)
  const companion = escapeHtml(partner || 'Kein Mitspieler angegeben')
  const id = escapeHtml(bookingId.slice(0, 8).toUpperCase())
  if (style === 'gemini') return `<!doctype html><html lang="de"><body style="margin:0;background:#f4f7f6;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff"><tr><td align="center" style="background:#1b4332;padding:34px;color:#fff"><h1 style="margin:0;font-size:28px">🎾 TC TRIER</h1><p style="margin:7px 0 0;color:#d8f3dc;letter-spacing:2px;font-size:12px">TENNISCLUB TRIER 1888</p></td></tr><tr><td align="center" style="background:#2d6a4f;padding:12px;color:#fff;font-weight:bold">✓ Platzbuchung erfolgreich bestätigt</td></tr><tr><td style="padding:36px 30px;color:#2b2d42"><h2 style="margin:0 0 15px;color:#1b4332">Dein Match wartet. 👋</h2><p style="line-height:1.6">Dein Platz beim TC Trier ist reserviert. Hier sind alle Details zu deinem bevorstehenden Spiel.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-left:5px solid #2d6a4f"><tr><td style="padding:20px;font-size:15px;line-height:2"><strong>📍 Platz:</strong> ${court}<br><strong>📅 Datum:</strong> ${date}<br><strong>⏰ Uhrzeit:</strong> ${time} – ${endTime} Uhr<br><strong>👥 Mitspieler:</strong> ${companion}<br><strong>🆔 Buchungs-ID:</strong> #${id}<br><strong>💳 Betrag:</strong> ${amount} €</td></tr></table><p style="margin-top:28px;padding:16px 20px;background:#e9ecef;border-radius:8px;font-size:13px;line-height:1.6"><strong>ℹ Wichtiger Hinweis</strong><br>Bitte betrete die Plätze nur mit geeigneten Tennisschuhen. Stornierungen verwaltest du in deinem TCT‑Konto.</p></td></tr><tr><td align="center" style="background:#1b4332;padding:24px;color:#d8f3dc;font-size:12px">Tennisclub Trier 1888 e.V.<br><span style="color:#fff">Wir sehen uns auf dem Platz.</span></td></tr></table></td></tr></table></body></html>`
  return `<!doctype html><html lang="de"><body style="margin:0;background:#e8e3d6;font-family:Georgia,serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:36px 12px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#f6f2e9"><tr><td align="center" style="background:#153a2c;padding:38px;color:#f6f2e9"><div style="margin:auto;border:1px solid #a98b5d;border-radius:50%;width:64px;height:64px;line-height:64px;color:#c9a86a;font-size:25px">TC</div><h1 style="margin:18px 0 7px;font-size:22px;letter-spacing:3px">TENNISCLUB TRIER</h1><p style="margin:0;color:#c9a86a;letter-spacing:4px;font-size:12px">EST. 1888</p></td></tr><tr><td style="height:3px;background:#a98b5d"></td></tr><tr><td align="center" style="padding:44px 48px 15px;color:#153a2c"><p style="margin:0;color:#a98b5d;font:12px Arial,sans-serif;letter-spacing:3px">PLATZRESERVIERUNG</p><h2 style="font-size:38px;line-height:1.1;margin:16px 0">Deine Buchung<br>ist bestätigt</h2><p style="font-size:17px;color:#4a4a42">Wir freuen uns auf dich. Dein Platz ist reserviert – hier sind alle Details.</p></td></tr><tr><td style="padding:26px 48px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e2dccb"><tr><td style="padding:24px 28px;border-bottom:1px solid #ece7da"><small style="font:11px Arial,sans-serif;color:#a98b5d;letter-spacing:2px">PLATZ</small><div style="margin-top:7px;font-size:27px;color:#153a2c">${court}</div></td></tr><tr><td style="padding:20px 28px;border-bottom:1px solid #ece7da;font-size:17px;line-height:1.7"><b>${date}</b><br><span style="color:#6a655a">${time} – ${endTime} Uhr</span></td></tr><tr><td style="padding:20px 28px;border-bottom:1px solid #ece7da"><small style="font:11px Arial,sans-serif;color:#a98b5d;letter-spacing:2px">MITSPIELER</small><div style="margin-top:7px;font-size:17px">${companion}</div></td></tr><tr><td style="padding:20px 28px;font:14px Arial,sans-serif">BUCHUNGSNUMMER · ${id}<span style="float:right">${amount} €</span></td></tr></table></td></tr><tr><td align="center" style="padding:16px 48px 40px;color:#6a655a;font-size:15px;line-height:1.6">Kostenfreie Stornierung verwaltest du vor Spielbeginn über dein TCT‑Konto.</td></tr><tr><td align="center" style="background:#153a2c;padding:30px;color:#a9b8af;font-size:13px">Tennisclub Trier 1888 e.V.<br><span style="display:inline-block;margin-top:12px;color:#f6f2e9">Wir sehen uns auf dem Platz.</span></td></tr></table></td></tr></table></body></html>`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return Response.json({ error: 'Nicht angemeldet.' }, { status: 401, headers: corsHeaders })
    const { bookingId, template = 'gemini' } = await request.json()
    if (typeof bookingId !== 'string') return Response.json({ error: 'Ungültige Buchung.' }, { status: 400, headers: corsHeaders })
    if (!['court', 'gemini', 'claude'].includes(template)) return Response.json({ error: 'Unbekannte E-Mail-Vorlage.' }, { status: 400, headers: corsHeaders })
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: booking } = await admin.from('court_bookings').select('id,user_id,status,starts_at,ends_at,booking_email,amount_cents,partner_name,courts(name,kind)').eq('id', bookingId).maybeSingle()
    if (!booking || booking.user_id !== user.id) return Response.json({ error: 'Nicht berechtigt.' }, { status: 403, headers: corsHeaders })
    const brevoKey = Deno.env.get('BREVO_API_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('BOOKING_FROM_EMAIL')
    if ((!brevoKey && !resendKey) || !from) return Response.json({ skipped: true, message: 'Der E-Mail-Versand ist noch nicht eingerichtet.' }, { headers: corsHeaders })
    const court = Array.isArray(booking.courts) ? booking.courts[0] : booking.courts
    const amount = (Number(booking.amount_cents) / 100).toFixed(2).replace('.', ',')
    const isCancellation = booking.status === 'cancelled'
    const subject = `${isCancellation ? 'TCT Buchungsstornierung' : 'TCT Buchungsbestätigung'} – ${court?.name ?? 'Platz'}`
    const body = isCancellation
      ? `Deine TCT-Buchung wurde storniert.\n\n${court?.name ?? 'Platz'}\n${booking.starts_at} bis ${booking.ends_at}\n\nDer Zeitraum ist wieder freigegeben.`
      : `Deine TCT-Buchung ist bestätigt.\n\n${court?.name ?? 'Platz'}\n${booking.starts_at} bis ${booking.ends_at}\nPreis: ${amount} €\n\n${court?.kind === 'padel' ? 'Bitte überweise den Betrag an Padelexpert GbR, Sparkasse Trier, IBAN DE05 5855 0130 0001 0468 20. Schläger, Bälle und Lichtschlüssel findest du in der Tennishalle auf Platz 1 links hinter dem Vorhang.' : 'Wir freuen uns auf dein Spiel.'}`
    const html = template === 'gemini' ? selectedTemplate({ court: court?.name ?? 'Platz', starts: booking.starts_at, ends: booking.ends_at, partner: booking.partner_name, id: booking.id, cancelled: isCancellation, kind: court?.kind ?? 'tennis', amount }) : template === 'court' ? bookingEmailHtml({
      courtName: court?.name ?? 'Platz',
      kind: court?.kind ?? 'tennis',
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      amount,
      isCancellation,
    }) : comparisonEmailHtml({ courtName: court?.name ?? 'Platz', startsAt: booking.starts_at, endsAt: booking.ends_at, amount, partner: booking.partner_name, bookingId: booking.id, style: template })
    const calendarAttachment = !isCancellation
      ? {
          name: `TCT-${(court?.name ?? 'Platz').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`,
          content: toBase64(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Tennisclub Trier 1888//Booking//DE\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nUID:${booking.id}@tennisclub-trier.de\r\nDTSTAMP:${icsDate(new Date().toISOString())}\r\nDTSTART:${icsDate(booking.starts_at)}\r\nDTEND:${icsDate(booking.ends_at)}\r\nSUMMARY:${icsEscape(`TCT · ${court?.name ?? 'Platz'}`)}\r\nLOCATION:Am Stadion 1\\, 54292 Trier\r\nDESCRIPTION:${icsEscape(`TCT Platzbuchung · ${court?.name ?? 'Platz'} · ${amount} €`)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`),
        }
      : null
    const response = brevoKey
      ? await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: { name: 'Tennisclub Trier 1888', email: from }, to: [{ email: booking.booking_email }], subject, textContent: body, htmlContent: html, ...(calendarAttachment ? { attachment: [calendarAttachment] } : {}) }) })
      : await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [booking.booking_email], subject, text: body, html, ...(calendarAttachment ? { attachments: [{ filename: calendarAttachment.name, content: calendarAttachment.content }] } : {}) }) })
    if (!response.ok) {
      const provider = brevoKey ? 'Brevo' : 'Resend'
      const details = await response.text()
      let reason = ''
      try {
        const parsed = JSON.parse(details)
        reason = typeof parsed.message === 'string' ? parsed.message : ''
      } catch {
        reason = details.slice(0, 180)
      }
      return Response.json(
        { error: `${provider} hat die E-Mail abgelehnt${reason ? `: ${reason}` : '.'}` },
        { headers: corsHeaders },
      )
    }
    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch {
    return Response.json({ error: 'Bestätigungs-E-Mail konnte nicht verarbeitet werden.' }, { status: 400, headers: corsHeaders })
  }
})
