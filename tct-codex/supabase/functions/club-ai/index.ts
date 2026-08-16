import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const ownerEmail = 'elfinko008@icloud.com'
type Role = 'management' | 'programmer' | 'admin' | 'editor' | 'content_manager' | 'tournament_manager' | 'team_manager'
type ProposalAction =
  | 'create_news' | 'update_news'
  | 'create_event' | 'update_team'
  | 'create_user' | 'update_theme'
  | 'update_facility' | 'update_history'
  | 'update_partner_note' | 'update_club_settings'
  | 'update_navigation'
type Proposal = { action: ProposalAction; title: string; details: string; warning?: string | null; payload: Record<string, unknown> }

// --- LLM-Provider-Abstraktion --------------------------------------------
// Die restliche Funktion kennt keine Provider-Details, nur callChatModel().
// Ein Wechsel des Anbieters ist über die Supabase-Secrets LLM_PROVIDER,
// LLM_API_KEY, LLM_BASE_URL und LLM_MODEL möglich, ohne Code hier anzufassen.
type LlmMessage = { role: 'system' | 'user'; content: string }
const callChatModel = async (messages: LlmMessage[]): Promise<string> => {
  const provider = (Deno.env.get('LLM_PROVIDER') ?? 'groq').toLowerCase()
  if (provider === 'groq') {
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) throw new Error('GROQ_API_KEY ist noch nicht als Supabase Secret gesetzt.')
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile', temperature: 0.2, response_format: { type: 'json_object' }, messages }),
    })
    if (!response.ok) throw new Error(`Groq konnte die Anfrage nicht verarbeiten (${response.status}).`)
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? '{}'
  }
  // Generischer OpenAI-kompatibler Anbieter (z. B. OpenAI, Together, Fireworks, ein eigener Endpunkt).
  const apiKey = Deno.env.get('LLM_API_KEY')
  const baseUrl = Deno.env.get('LLM_BASE_URL')
  const model = Deno.env.get('LLM_MODEL')
  if (!apiKey || !baseUrl || !model) throw new Error(`Für LLM_PROVIDER=${provider} müssen die Supabase-Secrets LLM_API_KEY, LLM_BASE_URL und LLM_MODEL gesetzt sein.`)
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages }),
  })
  if (!response.ok) throw new Error(`Die KI (${provider}) konnte die Anfrage nicht verarbeiten (${response.status}).`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? '{}'
}
type SiteTheme = {
  headingFont: 'dm-serif' | 'playfair' | 'cormorant' | 'libre-baskerville'
  bodyFont: 'manrope' | 'inter' | 'montserrat' | 'source-sans'
  darkColor: string
  deepDarkColor: string
  accentColor: string
  backgroundColor: string
}

const defaultSiteTheme: SiteTheme = {
  headingFont: 'dm-serif', bodyFont: 'manrope', darkColor: '#112e25',
  deepDarkColor: '#0b211a', accentColor: '#cef166', backgroundColor: '#f5f3ee',
}
const headingFonts = new Set<SiteTheme['headingFont']>(['dm-serif', 'playfair', 'cormorant', 'libre-baskerville'])
const bodyFonts = new Set<SiteTheme['bodyFont']>(['manrope', 'inter', 'montserrat', 'source-sans'])
const colorValue = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback
const normalizedTheme = (value: unknown, current: SiteTheme = defaultSiteTheme): SiteTheme => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    headingFont: typeof source.headingFont === 'string' && headingFonts.has(source.headingFont as SiteTheme['headingFont']) ? source.headingFont as SiteTheme['headingFont'] : current.headingFont,
    bodyFont: typeof source.bodyFont === 'string' && bodyFonts.has(source.bodyFont as SiteTheme['bodyFont']) ? source.bodyFont as SiteTheme['bodyFont'] : current.bodyFont,
    darkColor: colorValue(source.darkColor, current.darkColor),
    deepDarkColor: colorValue(source.deepDarkColor, current.deepDarkColor),
    accentColor: colorValue(source.accentColor, current.accentColor),
    backgroundColor: colorValue(source.backgroundColor, current.backgroundColor),
  }
}

const allowedActions: Record<Role, Proposal['action'][]> = {
  management: ['create_news', 'update_news', 'create_event', 'update_team', 'create_user', 'update_facility', 'update_history', 'update_partner_note', 'update_club_settings', 'update_navigation'],
  programmer: ['update_theme'],
  admin: ['create_news', 'update_news', 'create_event', 'update_team', 'update_facility', 'update_history', 'update_partner_note', 'update_club_settings', 'update_navigation'],
  editor: ['create_news', 'update_news', 'create_event', 'update_team', 'update_facility', 'update_history', 'update_partner_note'],
  content_manager: ['create_news', 'update_news'],
  tournament_manager: ['create_event'],
  team_manager: ['update_team'],
}

// The model is never a source of authority.  This second, server-side check
// deliberately blocks destructive and account-security operations even if a
// manipulated model response tries to smuggle one in.
const forbiddenActions = new Set([
  'delete_user', 'delete_news', 'delete_event', 'delete_team', 'delete_partner',
  'change_role', 'reset_password', 'change_email', 'execute_sql', 'storage_delete',
])

const isAllowedAction = (role: Role, action: unknown): action is Proposal['action'] =>
  typeof action === 'string'
  && !forbiddenActions.has(action)
  && allowedActions[role].includes(action as Proposal['action'])

const json = (value: string) => {
  const clean = value.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  return JSON.parse(clean)
}

const validRole = (role: string): role is Role => Object.keys(allowedActions).includes(role)

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

const platformKnowledge = `
TCT-WEBSITE-WISSEN:
- Öffentliche Bereiche: Startseite, Club/Geschichte, Anlage, Mannschaften, Turniere & Termine, Mitgliedschaft, Downloads und Kontakt.
- Die Startseite enthält einen Fokusplatz für genau eine News oder einen Termin, aktuelle Inhalte, einen Schnellzugriff zu Mitgliedschaft, Platzbuchung, Teams und Kontakt sowie den Button „Mitglied werden“.
- Die Anlage: 21 Außenplätze, 3 Hallenplätze und 1 Padelplatz. Platz- und Hallenbuchung führen zum externen Buchungssystem.
- Der Club besteht seit 1888 und hat mehr als 600 Mitglieder. Es gibt Damen-, Herren- und Jugendteams. Tabellen und vollständige Meldelisten führen zum offiziellen Tennisverband.
- News: Redaktionsrollen können News mit Titel, Kurztext, Langtext und Bild erstellen, bearbeiten oder löschen. Historische Beiträge wurden bereits übernommen und dürfen wie andere News bearbeitet werden.
- Termine: Termine und Turniere können mit Titel, Kategorie, Beginn, Ende, Beschreibung, Zuschauerfreigabe, Eintrittspreis und vollständigem Veranstaltungsort angelegt werden. Aus der Adresse baut die Website automatisch eine Google-Maps-Navigation.
- Im Fokus setzen: Dort können bestehende News oder Termine auf die große Startseitenfläche gesetzt werden. Über „Neue News“ oder „Neuer Termin“ wird direkt die passende Erstellung geöffnet; danach kann der neue Inhalt gewählt werden.
- Mannschaften: Saisonbilder, Bereichstexte und Hinweise können im Mannschaftsbereich gepflegt werden. Teamfotos lassen sich austauschen.
- Website-Bilder: Logo, Startseiten-, Anlagen-, Hallen-, Padel-, Restaurant-, Turnier- und Tennisschulbild können ersetzt werden.
- Downloads: Hallenpreise, Aufnahmeantrag und weitere PDFs werden im Downloadbereich verwaltet.
- Mitgliedschaft: Beiträge und Hinweise können im Adminbereich geändert werden. Die öffentliche Seite verlinkt den Aufnahmeantrag.
- Kontaktanfragen landen im Admin-Postfach und können als gelesen oder archiviert markiert werden.
- Benutzer: Beim Anlegen genügen Name, Startpasswort, Rolle und entweder E-Mail oder Benutzername. Ohne E-Mail wird ein technisches internes Login angelegt; die Person meldet sich zunächst über den Benutzernamen an und kann später selbst eine E-Mail hinterlegen. Ein fehlender Benutzername wird aus dem Namen als v.nachname erzeugt.
- Rollen: Management verwaltet alles einschließlich Benutzer. Admin und Editor verwalten redaktionelle Inhalte. Content-Manager verwalten News und allgemeine Inhalte. Turnierleitung verwaltet Termine und Turniere. Mannschaftsführung verwaltet Mannschaftsinhalte. Ausschließlich die Rolle Programmer darf das Website-Design über die KI ändern; diese Rolle erhält dadurch keine Benutzerverwaltung. Jede Aktion muss zur Rolle passen.
- Sicherheit: Änderungen durch KI werden niemals direkt ausgeführt. Für jede Aktion (News, Termine, Mannschaften, Anlage-Bereiche, Chronik, Partnerhinweise, Menüpunkte, Website-Einstellungen, Benutzer, Design) gibt es erst einen Vorschlag mit Zusammenfassung und dann eine ausdrückliche Bestätigung; wird dabei bestehender Inhalt ersetzt, erscheint zusätzlich ein Warnhinweis. Löschen kann die KI nie. Das Änderungslog dokumentiert redaktionelle Änderungen.
- Datenschutz: Supabase wird für Anmeldung, Daten und Dateien verwendet. Die KI darf keine Zugangsdaten, API-Schlüssel oder sensiblen Mitgliederdaten anfordern oder verarbeiten.
`

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return Response.json({ error: 'Nicht angemeldet.' }, { headers: corsHeaders })
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await admin.from('profiles').select('role,display_name').eq('id', user.id).maybeSingle()
    if (!profile || !validRole(profile.role)) return Response.json({ error: 'Dein Konto hat keine KI-Berechtigung.' }, { headers: corsHeaders })
    const role = profile.role
    const body = await request.json()

    if (body.mode === 'chat') {
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 4000) : ''
      if (!prompt) return Response.json({ error: 'Bitte schreibe eine Aufgabe.' }, { headers: corsHeaders })
      const allowed = allowedActions[role]
      const [{ data: currentEvents }, { data: currentNews }, { data: themeRow }, { data: facilitiesRow }, { data: historyRow }, { data: partnersRow }, { data: navRow }, { data: clubSettingsRow }] = await Promise.all([
        admin.from('events').select('title,category,starts_at,ends_at').eq('status', 'published').order('starts_at', { ascending: true }).limit(12),
        admin.from('news').select('title,excerpt,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(8),
        admin.from('club_content').select('value').eq('key', 'site_theme').maybeSingle(),
        admin.from('club_content').select('value').eq('key', 'facilities').maybeSingle(),
        admin.from('club_content').select('value').eq('key', 'history').maybeSingle(),
        admin.from('club_content').select('value').eq('key', 'partners').maybeSingle(),
        admin.from('club_content').select('value').eq('key', 'navigation').maybeSingle(),
        admin.from('club_content').select('value').eq('key', 'club_settings').maybeSingle(),
      ])
      const currentTheme = normalizedTheme(themeRow?.value?.settings)
      const facilityTitles = (Array.isArray(facilitiesRow?.value?.items) ? facilitiesRow.value.items : []).map((item: { title?: string; text?: string }) => `${item.title} (Text: "${item.text ?? ''}")`).join('; ') || 'keine hinterlegt'
      const historyEntries = (Array.isArray(historyRow?.value?.items) ? historyRow.value.items : []).map((item: { year?: string; title?: string }) => `${item.year} · ${item.title}`).join('; ') || 'keine hinterlegt'
      const partnerNames = (Array.isArray(partnersRow?.value?.items) ? partnersRow.value.items : []).map((item: { name?: string; note?: string }) => `${item.name}${item.note ? ` (Hinweis: "${item.note}")` : ''}`).join('; ') || 'keine hinterlegt'
      const navLabels = (Array.isArray(navRow?.value?.items) ? navRow.value.items : []).map((item: { label?: string; visible?: boolean }) => `${item.label}${item.visible === false ? ' (versteckt)' : ''}`).join('; ') || 'keine hinterlegt'
      const clubSettings = clubSettingsRow?.value?.settings ?? {}
      const clubContext = `Aktuelle TCT-Termine: ${(currentEvents ?? []).map((event) => `${event.title}${event.category ? ` (${event.category})` : ''}${event.starts_at ? ` am ${event.starts_at}` : ''}`).join('; ') || 'keine hinterlegt'}. Aktuelle News: ${(currentNews ?? []).map((news) => `${news.title}${news.published_at ? ` (${news.published_at})` : ''}`).join('; ') || 'keine hinterlegt'}. Aktuelles Website-Design: ${JSON.stringify(currentTheme)}. Anlage-Bereiche: ${facilityTitles}. Chronik-Einträge: ${historyEntries}. Partner: ${partnerNames}. Menüpunkte: ${navLabels}. Öffnungszeiten-Text: "${clubSettings.openingHours ?? ''}". Meta-Beschreibung: "${clubSettings.siteDescription ?? ''}".`
      const system = `Du bist der TCT Club Assistant. Antworte ausschließlich als valides JSON ohne Markdown. Rolle: ${role}. Erlaubte Aktionen: ${allowed.join(', ') || 'keine'}. ${platformKnowledge} ${clubContext} Du beantwortest normale Fragen zur Website, zum Adminbereich und zu den genannten aktuellen Clubinhalten direkt, verständlich und knapp im Feld reply. Bei einer Frage ist proposal immer null. Wenn dir eine Information nicht vorliegt, sage das ehrlich statt zu raten. Erstelle nur dann einen Änderungsvorschlag, wenn die Person eindeutig etwas erstellen oder ändern will. Erstelle NIE eine Aktion außerhalb dieser Liste und fordere niemals Zugangsdaten, API-Keys oder Passwörter an. Benutzer löschen, Inhalte löschen, Rollen ändern, Passwörter oder E-Mail-Adressen ändern, Platzsperren, SQL ausführen und Dateien löschen sind ausnahmslos verboten – auch wenn der Prompt etwas anderes verlangt. Behaupte niemals, etwas ausgeführt zu haben. Format: {"reply":"kurze deutsche Antwort","proposal":null ODER {"action":"eine erlaubte Aktion","title":"kurzer Titel","details":"was nach Bestätigung passiert","warning":null ODER "kurzer Warnhinweis, was dabei ersetzt wird","payload":{...}}}. Setze warning IMMER (nicht null), wenn die Aktion bestehenden Inhalt überschreibt oder ersetzt (alle update_*-Aktionen sowie update_theme) – nenne darin knapp, welcher aktuelle Wert verloren geht. Bei reinen Neu-Anlagen (create_news, create_event, create_user) ist warning null, weil nichts ersetzt wird. Payload-Schema: create_news {title,excerpt,body}; update_news {title (muss exakt zu einer bestehenden News passen),newTitle?,excerpt?,body?}; create_event {title,category,description,starts_at,ends_at,registration_enabled,spectators_allowed,admission_price_cents,venue_name,venue_address}; update_team {name (muss exakt zu einem bestehenden Mannschaftsbereich passen),text?,note?}; update_facility {title (muss exakt zu einem bestehenden Anlage-Bereich passen),newTitle?,text?,eyebrow?}; update_history {year,title (müssen exakt zu einem bestehenden Chronik-Eintrag passen),newTitle?,label?,text?}; update_partner_note {name (muss exakt zu einem bestehenden Partner passen),note}; update_navigation {label (muss exakt zu einem bestehenden Menüpunkt passen),newLabel?,visible?}; update_club_settings {openingHours?,siteDescription?}; create_user {displayName,username?,email?,role}; update_theme {headingFont?,bodyFont?,darkColor?,deepDarkColor?,accentColor?,backgroundColor?}. Für update_theme sind ausschließlich diese Schrift-IDs erlaubt: headingFont dm-serif, playfair, cormorant oder libre-baskerville; bodyFont manrope, inter, montserrat oder source-sans. Farben müssen vollständige Hexwerte wie #112e25 sein. Behalte starken Kontrast, ändere nur ausdrücklich verlangte Werte und liefere update_theme ausschließlich für die Rolle programmer. Bei allen update_*-Aktionen MUSS das angegebene title/name/label/year exakt (nicht sinngemäß) zu einem oben genannten aktuellen Eintrag passen; bist du dir nicht sicher, welcher Eintrag gemeint ist, frage im reply nach und liefere proposal null, statt zu raten. admission_price_cents ist der Eintritt in Euro-Cent, 0 bedeutet kostenlos. spectators_allowed ist nur wahr, wenn Besucher ausdrücklich zugelassen werden. Erfinde nie einen Preis oder eine Adresse; fehlen Angaben, frage im reply danach und liefere proposal null. Für create_user genügt E-Mail ODER Benutzername. Fehlt der Benutzername, liefere ihn als erster Buchstabe des Vornamens, Punkt, Nachname in Kleinbuchstaben (z. B. Markus Mustermann -> m.mustermann). Fehlt die E-Mail, lasse email leer. Für create_user kein Passwort erzeugen oder verlangen; das wird erst lokal in der Bestätigung eingegeben.`
      let content: string
      try {
        content = await callChatModel([{ role: 'system', content: system }, { role: 'user', content: prompt }])
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : 'Die KI konnte die Anfrage nicht verarbeiten.' }, { headers: corsHeaders })
      }
      const result = json(content) as { reply?: string; proposal?: Proposal | null }
      if (result.proposal && !isAllowedAction(role, result.proposal.action)) result.proposal = null
      return Response.json({ reply: result.reply ?? 'Ich kann dazu einen Vorschlag erstellen.', proposal: result.proposal ?? null }, { headers: corsHeaders })
    }

    if (body.mode === 'reset_theme') {
      if (user.email !== ownerEmail) return Response.json({ error: 'Nur der Eigentümer darf das Design auf den TCT-Standard zurücksetzen.' }, { headers: corsHeaders })
      const { data: theme, error } = await userClient.rpc('reset_site_theme_to_default')
      return Response.json(error ? { error: error.message } : { ok: true, message: 'Das TCT-Standarddesign wurde wiederhergestellt.', theme: normalizedTheme(theme) }, { headers: corsHeaders })
    }

    if (body.mode === 'execute') {
      const proposal = body.proposal as Proposal
      if (!proposal || !isAllowedAction(role, proposal.action)) return Response.json({ error: 'Diese Aktion ist für deine Rolle nicht erlaubt.' }, { headers: corsHeaders })
      const payload = proposal.payload ?? {}
      if (proposal.action === 'create_news') {
        const { error } = await userClient.from('news').insert({ title: String(payload.title ?? ''), excerpt: String(payload.excerpt ?? '') || null, body: String(payload.body ?? '') || null, status: 'published', published_at: new Date().toISOString() })
        return Response.json(error ? { error: error.message } : { ok: true, message: 'News wurde veröffentlicht.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'create_event') {
        const startsAt = String(payload.starts_at ?? '')
        const endsAt = String(payload.ends_at ?? '')
        const spectatorsAllowed = payload.spectators_allowed === true
        const requestedPrice = typeof payload.admission_price_cents === 'number' ? payload.admission_price_cents : Number.NaN
        const admissionPrice = spectatorsAllowed && Number.isFinite(requestedPrice) && requestedPrice >= 0 ? Math.round(requestedPrice) : null
        const venueAddress = String(payload.venue_address ?? '').trim()
        if (!startsAt || !venueAddress || (spectatorsAllowed && admissionPrice === null)) return Response.json({ error: 'Für den Termin fehlen Datum, vollständige Adresse oder ein gültiger Eintrittspreis.' }, { headers: corsHeaders })
        const startDate = new Date(startsAt)
        const endDate = endsAt ? new Date(endsAt) : null
        if (!Number.isFinite(startDate.getTime()) || (endDate && (!Number.isFinite(endDate.getTime()) || endDate <= startDate))) return Response.json({ error: 'Beginn oder Ende des Termins ist ungültig.' }, { headers: corsHeaders })
        const { error } = await userClient.from('events').insert({ title: String(payload.title ?? ''), category: String(payload.category ?? '') || null, description: String(payload.description ?? '') || null, starts_at: startDate.toISOString(), ends_at: endDate?.toISOString() ?? null, registration_enabled: payload.registration_enabled === true, spectators_allowed: spectatorsAllowed, admission_price_cents: admissionPrice, venue_name: String(payload.venue_name ?? '') || null, venue_address: venueAddress, status: 'published' })
        return Response.json(error ? { error: error.message } : { ok: true, message: 'Termin wurde veröffentlicht.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'update_team') {
        const { data: current, error: readError } = await admin.from('club_content').select('value').eq('key', 'teams').maybeSingle()
        const currentItems = Array.isArray(current?.value?.items) ? current.value.items : []
        const name = String(payload.name ?? '')
        if (!currentItems.some((team: { name?: string }) => team.name === name)) return Response.json({ error: 'Diese Mannschaft wurde nicht gefunden.' }, { headers: corsHeaders })
        const items = currentItems.map((team: Record<string, unknown>) => team.name === name ? { ...team, text: String(payload.text ?? team.text ?? ''), note: String(payload.note ?? team.note ?? '') } : team)
        const { error } = await userClient.from('club_content').upsert({ key: 'teams', value: { items }, updated_by: user.id })
        return Response.json(readError || error ? { error: readError?.message ?? error?.message } : { ok: true, message: 'Mannschaftsbereich wurde aktualisiert.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'update_news') {
        const title = String(payload.title ?? '').trim()
        const { data: existing, error: findError } = await admin.from('news').select('id').ilike('title', title).maybeSingle()
        if (findError || !existing) return Response.json({ error: 'Diese News wurde nicht gefunden.' }, { headers: corsHeaders })
        const update: Record<string, unknown> = {}
        if (typeof payload.newTitle === 'string' && payload.newTitle.trim()) update.title = payload.newTitle.trim()
        if (typeof payload.excerpt === 'string') update.excerpt = payload.excerpt || null
        if (typeof payload.body === 'string') update.body = payload.body || null
        if (!Object.keys(update).length) return Response.json({ error: 'Es wurde keine Änderung angegeben.' }, { headers: corsHeaders })
        const { error } = await userClient.from('news').update(update).eq('id', existing.id)
        return Response.json(error ? { error: error.message } : { ok: true, message: 'News wurde aktualisiert.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'update_facility') {
        const { data: current, error: readError } = await admin.from('club_content').select('value').eq('key', 'facilities').maybeSingle()
        const currentItems = Array.isArray(current?.value?.items) ? current.value.items : []
        const title = String(payload.title ?? '')
        if (!currentItems.some((item: { title?: string }) => item.title === title)) return Response.json({ error: 'Dieser Anlage-Bereich wurde nicht gefunden.' }, { headers: corsHeaders })
        const items = currentItems.map((item: Record<string, unknown>) => item.title === title ? { ...item, title: typeof payload.newTitle === 'string' && payload.newTitle.trim() ? payload.newTitle.trim() : item.title, text: typeof payload.text === 'string' ? payload.text : item.text, eyebrow: typeof payload.eyebrow === 'string' ? payload.eyebrow : item.eyebrow } : item)
        const { error } = await userClient.from('club_content').upsert({ key: 'facilities', value: { items }, updated_by: user.id })
        return Response.json(readError || error ? { error: readError?.message ?? error?.message } : { ok: true, message: 'Anlage-Bereich wurde aktualisiert.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'update_history') {
        const { data: current, error: readError } = await admin.from('club_content').select('value').eq('key', 'history').maybeSingle()
        const currentItems = Array.isArray(current?.value?.items) ? current.value.items : []
        const year = String(payload.year ?? '')
        const title = String(payload.title ?? '')
        if (!currentItems.some((item: { year?: string; title?: string }) => item.year === year && item.title === title)) return Response.json({ error: 'Dieser Chronik-Eintrag wurde nicht gefunden.' }, { headers: corsHeaders })
        const items = currentItems.map((item: Record<string, unknown>) => item.year === year && item.title === title ? { ...item, title: typeof payload.newTitle === 'string' && payload.newTitle.trim() ? payload.newTitle.trim() : item.title, label: typeof payload.label === 'string' ? payload.label : item.label, text: typeof payload.text === 'string' ? payload.text : item.text } : item)
        const { error } = await userClient.from('club_content').upsert({ key: 'history', value: { items }, updated_by: user.id })
        return Response.json(readError || error ? { error: readError?.message ?? error?.message } : { ok: true, message: 'Chronik-Eintrag wurde aktualisiert.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'update_partner_note') {
        const { data: current, error: readError } = await admin.from('club_content').select('value').eq('key', 'partners').maybeSingle()
        const currentItems = Array.isArray(current?.value?.items) ? current.value.items : []
        const name = String(payload.name ?? '')
        if (!currentItems.some((item: { name?: string }) => item.name === name)) return Response.json({ error: 'Dieser Partner wurde nicht gefunden.' }, { headers: corsHeaders })
        const items = currentItems.map((item: Record<string, unknown>) => item.name === name ? { ...item, note: String(payload.note ?? '') } : item)
        const { error } = await userClient.from('club_content').upsert({ key: 'partners', value: { items }, updated_by: user.id })
        return Response.json(readError || error ? { error: readError?.message ?? error?.message } : { ok: true, message: 'Partnerhinweis wurde aktualisiert.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'update_navigation') {
        const { data: current, error: readError } = await admin.from('club_content').select('value').eq('key', 'navigation').maybeSingle()
        const currentItems = Array.isArray(current?.value?.items) ? current.value.items : []
        const label = String(payload.label ?? '')
        if (!currentItems.some((item: { label?: string }) => item.label === label)) return Response.json({ error: 'Dieser Menüpunkt wurde nicht gefunden.' }, { headers: corsHeaders })
        const items = currentItems.map((item: Record<string, unknown>) => item.label === label ? { ...item, label: typeof payload.newLabel === 'string' && payload.newLabel.trim() ? payload.newLabel.trim() : item.label, visible: typeof payload.visible === 'boolean' ? payload.visible : item.visible } : item)
        if (!items.some((item: { visible?: boolean }) => item.visible)) return Response.json({ error: 'Mindestens ein Menüpunkt muss sichtbar bleiben.' }, { headers: corsHeaders })
        const { error } = await userClient.from('club_content').upsert({ key: 'navigation', value: { items }, updated_by: user.id })
        return Response.json(readError || error ? { error: readError?.message ?? error?.message } : { ok: true, message: 'Navigation wurde aktualisiert.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'update_club_settings') {
        const { data: current, error: readError } = await admin.from('club_content').select('value').eq('key', 'club_settings').maybeSingle()
        const currentSettings = current?.value?.settings ?? {}
        const settings = { ...currentSettings }
        if (typeof payload.openingHours === 'string') settings.openingHours = payload.openingHours
        if (typeof payload.siteDescription === 'string') settings.siteDescription = payload.siteDescription
        const { error } = await userClient.from('club_content').upsert({ key: 'club_settings', value: { settings }, updated_by: user.id })
        return Response.json(readError || error ? { error: readError?.message ?? error?.message } : { ok: true, message: 'Website-Einstellungen wurden aktualisiert.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'update_theme') {
        if (role !== 'programmer') return Response.json({ error: 'Nur die Rolle Programmer darf das Website-Design ändern.' }, { headers: corsHeaders })
        const { data: currentRow, error: readError } = await admin.from('club_content').select('value').eq('key', 'site_theme').maybeSingle()
        const currentTheme = normalizedTheme(currentRow?.value?.settings)
        const nextTheme = normalizedTheme(payload, currentTheme)
        if (JSON.stringify(nextTheme) === JSON.stringify(currentTheme)) return Response.json({ error: 'Der Vorschlag enthält keine gültige Designänderung.' }, { headers: corsHeaders })
        const { error } = await userClient.from('club_content').upsert({ key: 'site_theme', value: { settings: nextTheme }, updated_by: user.id })
        return Response.json(readError || error ? { error: readError?.message ?? error?.message } : { ok: true, message: 'Website-Design wurde aktualisiert.', theme: nextTheme }, { headers: corsHeaders })
      }
      if (proposal.action === 'create_user') {
        if (role !== 'management' && user.email !== ownerEmail) return Response.json({ error: 'Nur Management oder Eigentümer dürfen Benutzer anlegen.' }, { headers: corsHeaders })
        const password = typeof body.password === 'string' ? body.password : ''
        if (password.length < 10) return Response.json({ error: 'Für neue Benutzer ist ein Startpasswort mit mindestens 10 Zeichen nötig.' }, { headers: corsHeaders })
        const requestedEmail = String(payload.email ?? '').trim().toLowerCase(); const requestedUsername = String(payload.username ?? '').trim(); const displayName = String(payload.displayName ?? '').trim(); const nextRole = String(payload.role ?? '')
        if (!displayName || (!requestedEmail && !requestedUsername) || !validRole(nextRole)) return Response.json({ error: 'Name, Rolle und entweder E-Mail oder Benutzername sind erforderlich.' }, { headers: corsHeaders })
        if (requestedEmail && !/^\S+@\S+\.\S+$/.test(requestedEmail)) return Response.json({ error: 'Bitte eine gültige E-Mail-Adresse angeben oder leer lassen.' }, { headers: corsHeaders })
        const username = await uniqueUsername(admin, requestedUsername, displayName, requestedEmail)
        if (!username) return Response.json({ error: 'Für diesen Namen konnte kein gültiger Benutzername erzeugt werden.' }, { headers: corsHeaders })
        const email = requestedEmail || `${username}@tct-intern.invalid`
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
        if (error || !data.user) return Response.json({ error: error?.message ?? 'Konto konnte nicht erstellt werden.' }, { headers: corsHeaders })
        const profilePayload = { id: data.user.id, display_name: displayName, username, login_email: email, role: nextRole, must_change_password: true }
        const { error: profileError } = await admin.from('profiles').upsert(profilePayload)
        if (profileError) { await admin.auth.admin.deleteUser(data.user.id); return Response.json({ error: profileError.message }, { headers: corsHeaders }) }
        await admin.from('audit_log').insert({ actor_id: user.id, actor_email: user.email, action: 'INSERT', table_name: 'profiles', row_id: data.user.id, before_data: null, after_data: profilePayload })
        return Response.json({ ok: true, message: `Benutzer @${username} wurde angelegt${requestedEmail ? '' : ' (zunächst nur per Benutzername)'}. Beim ersten Login ist ein Passwortwechsel erforderlich.` }, { headers: corsHeaders })
      }
    }
    return Response.json({ error: 'Ungültige KI-Anfrage.' }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unbekannter KI-Fehler.' }, { headers: corsHeaders })
  }
})
