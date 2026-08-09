import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const ownerEmail = 'elfinko008@icloud.com'
type Role = 'management' | 'admin' | 'editor' | 'content_manager' | 'tournament_manager' | 'team_manager'
type Proposal = { action: 'create_news' | 'create_event' | 'update_team' | 'create_user'; title: string; details: string; payload: Record<string, unknown> }

const allowedActions: Record<Role, Proposal['action'][]> = {
  management: ['create_news', 'create_event', 'update_team', 'create_user'],
  admin: ['create_news', 'create_event', 'update_team'],
  editor: ['create_news', 'create_event', 'update_team'],
  content_manager: ['create_news'],
  tournament_manager: ['create_event'],
  team_manager: ['update_team'],
}

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
- Termine: Termine und Turniere können mit Titel, Kategorie, Beginn, Ende und Beschreibung angelegt, bearbeitet und gelöscht werden. Kategorien helfen bei der Darstellung und Filterung.
- Im Fokus setzen: Dort können bestehende News oder Termine auf die große Startseitenfläche gesetzt werden. Über „Neue News“ oder „Neuer Termin“ wird direkt die passende Erstellung geöffnet; danach kann der neue Inhalt gewählt werden.
- Mannschaften: Saisonbilder, Bereichstexte und Hinweise können im Mannschaftsbereich gepflegt werden. Teamfotos lassen sich austauschen.
- Website-Bilder: Logo, Startseiten-, Anlagen-, Hallen-, Padel-, Restaurant-, Turnier- und Tennisschulbild können ersetzt werden.
- Downloads: Hallenpreise, Aufnahmeantrag und weitere PDFs werden im Downloadbereich verwaltet.
- Mitgliedschaft: Beiträge und Hinweise können im Adminbereich geändert werden. Die öffentliche Seite verlinkt den Aufnahmeantrag.
- Kontaktanfragen landen im Admin-Postfach und können als gelesen oder archiviert markiert werden.
- Benutzer: Beim Anlegen genügen Name, Startpasswort, Rolle und entweder E-Mail oder Benutzername. Ohne E-Mail wird ein technisches internes Login angelegt; die Person meldet sich zunächst über den Benutzernamen an und kann später selbst eine E-Mail hinterlegen. Ein fehlender Benutzername wird aus dem Namen als v.nachname erzeugt.
- Rollen: Management verwaltet alles einschließlich Benutzer. Admin und Editor verwalten redaktionelle Inhalte. Content-Manager verwalten News und allgemeine Inhalte. Turnierleitung verwaltet Termine und Turniere. Mannschaftsführung verwaltet Mannschaftsinhalte. Jede Aktion muss zur Rolle passen.
- Sicherheit: Änderungen durch KI werden niemals direkt ausgeführt. Bei News, Terminen, Mannschaften und Benutzern gibt es erst einen Vorschlag und dann eine ausdrückliche Bestätigung. Das Änderungslog dokumentiert redaktionelle Änderungen.
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
      const apiKey = Deno.env.get('GROQ_API_KEY')
      if (!apiKey) return Response.json({ error: 'GROQ_API_KEY ist noch nicht als Supabase Secret gesetzt.' }, { headers: corsHeaders })
      const allowed = allowedActions[role]
      const [{ data: currentEvents }, { data: currentNews }] = await Promise.all([
        admin.from('events').select('title,category,starts_at,ends_at').eq('status', 'published').order('starts_at', { ascending: true }).limit(12),
        admin.from('news').select('title,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(8),
      ])
      const clubContext = `Aktuelle TCT-Termine: ${(currentEvents ?? []).map((event) => `${event.title}${event.category ? ` (${event.category})` : ''}${event.starts_at ? ` am ${event.starts_at}` : ''}`).join('; ') || 'keine hinterlegt'}. Aktuelle News: ${(currentNews ?? []).map((news) => `${news.title}${news.published_at ? ` (${news.published_at})` : ''}`).join('; ') || 'keine hinterlegt'}.`
      const system = `Du bist der TCT Club Assistant. Antworte ausschließlich als valides JSON ohne Markdown. Rolle: ${role}. Erlaubte Aktionen: ${allowed.join(', ') || 'keine'}. ${platformKnowledge} ${clubContext} Du beantwortest normale Fragen zur Website, zum Adminbereich und zu den genannten aktuellen Clubinhalten direkt, verständlich und knapp im Feld reply. Bei einer Frage ist proposal immer null. Wenn dir eine Information nicht vorliegt, sage das ehrlich statt zu raten. Erstelle nur dann einen Änderungsvorschlag, wenn die Person eindeutig etwas erstellen oder ändern will. Erstelle NIE eine Aktion außerhalb dieser Liste und fordere niemals Zugangsdaten, API-Keys oder Passwörter an. Behaupte niemals, etwas ausgeführt zu haben. Format: {"reply":"kurze deutsche Antwort","proposal":null ODER {"action":"eine erlaubte Aktion","title":"kurzer Titel","details":"was nach Bestätigung passiert","payload":{...}}}. Payload-Schema: create_news {title,excerpt,body}; create_event {title,category,description,starts_at,ends_at}; update_team {name,text,note}; create_user {displayName,username?,email?,role}. Für create_user genügt E-Mail ODER Benutzername. Fehlt der Benutzername, liefere ihn als erster Buchstabe des Vornamens, Punkt, Nachname in Kleinbuchstaben (z. B. Markus Mustermann -> m.mustermann). Fehlt die E-Mail, lasse email leer. Für create_user kein Passwort erzeugen oder verlangen; das wird erst lokal in der Bestätigung eingegeben.`
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
      })
      if (!groqResponse.ok) return Response.json({ error: `Groq konnte die Anfrage nicht verarbeiten (${groqResponse.status}).` }, { headers: corsHeaders })
      const groq = await groqResponse.json()
      const result = json(groq.choices?.[0]?.message?.content ?? '{}') as { reply?: string; proposal?: Proposal | null }
      if (result.proposal && !allowed.includes(result.proposal.action)) result.proposal = null
      return Response.json({ reply: result.reply ?? 'Ich kann dazu einen Vorschlag erstellen.', proposal: result.proposal ?? null }, { headers: corsHeaders })
    }

    if (body.mode === 'execute') {
      const proposal = body.proposal as Proposal
      if (!proposal || !allowedActions[role].includes(proposal.action)) return Response.json({ error: 'Diese Aktion ist für deine Rolle nicht erlaubt.' }, { headers: corsHeaders })
      const payload = proposal.payload ?? {}
      if (proposal.action === 'create_news') {
        const { error } = await userClient.from('news').insert({ title: String(payload.title ?? ''), excerpt: String(payload.excerpt ?? '') || null, body: String(payload.body ?? '') || null, status: 'published', published_at: new Date().toISOString() })
        return Response.json(error ? { error: error.message } : { ok: true, message: 'News wurde veröffentlicht.' }, { headers: corsHeaders })
      }
      if (proposal.action === 'create_event') {
        const startsAt = String(payload.starts_at ?? '')
        const endsAt = String(payload.ends_at ?? '')
        const { error } = await userClient.from('events').insert({ title: String(payload.title ?? ''), category: String(payload.category ?? '') || null, description: String(payload.description ?? '') || null, starts_at: startsAt ? new Date(startsAt).toISOString() : null, ends_at: endsAt ? new Date(endsAt).toISOString() : null, status: 'published' })
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
