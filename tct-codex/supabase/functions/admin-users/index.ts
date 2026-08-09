import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const ownerEmail = 'elfinko008@icloud.com'

const safeProfile = (profile: Record<string, unknown> | null) => profile ? ({ id: profile.id, display_name: profile.display_name, username: profile.username, login_email: profile.login_email, role: profile.role }) : null

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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authHeader = request.headers.get('Authorization') ?? ''
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const { data: { user } } = await client.auth.getUser()
  const body = await request.json()
  if (!user) return Response.json({ error: 'Nicht berechtigt.' }, { headers: corsHeaders })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const writeUserAudit = async (action: 'INSERT' | 'UPDATE' | 'DELETE', rowId: string, beforeData: Record<string, unknown> | null, afterData: Record<string, unknown> | null) => {
    await admin.from('audit_log').insert({ actor_id: user.id, actor_email: user.email, action, table_name: 'profiles', row_id: rowId, before_data: beforeData, after_data: afterData })
  }
  if (body.action === 'passwordChanged') {
    const { error } = await admin.from('profiles').update({ must_change_password: false }).eq('id', user.id)
    return Response.json(error ? { error: error.message } : { ok: true }, { headers: corsHeaders })
  }
  if (body.action === 'changeOwnName') {
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
    if (displayName.length < 2 || displayName.length > 100) return Response.json({ error: 'Bitte gib einen Namen mit 2 bis 100 Zeichen ein.' }, { headers: corsHeaders })
    const { data: beforeProfile } = await admin.from('profiles').select('id,display_name,username,login_email,role').eq('id', user.id).maybeSingle()
    const { data: afterProfile, error } = await admin.from('profiles').update({ display_name: displayName }).eq('id', user.id).select('id,display_name,username,login_email,role').maybeSingle()
    if (!error) await writeUserAudit('UPDATE', user.id, safeProfile(beforeProfile), safeProfile(afterProfile))
    return Response.json(error ? { error: error.message } : { ok: true }, { headers: corsHeaders })
  }
  if (body.action === 'changeOwnEmail') {
    return Response.json({ error: 'E-Mail-Änderungen sind nur noch über Kontoeinstellungen mit Bestätigungscode möglich.' }, { status: 400, headers: corsHeaders })
  }
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const canManageUsers = user.email === ownerEmail || callerProfile?.role === 'management'
  if (!canManageUsers) return Response.json({ error: 'Nicht berechtigt.' }, { headers: corsHeaders })
  if (body.action === 'list') {
    const { data, error } = await admin.from('profiles').select('id,display_name,username,login_email,role,must_change_password,created_at').order('created_at', { ascending: false })
    return Response.json(error ? { error: error.message } : { users: data }, { headers: corsHeaders })
  }
  if (body.action === 'create') {
    const requestedEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const requestedUsername = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
    const role = typeof body.role === 'string' ? body.role : ''
    if (!displayName || !password || !role || (!requestedEmail && !requestedUsername)) return Response.json({ error: 'Name, Passwort, Rolle und entweder E-Mail oder Benutzername sind erforderlich.' }, { headers: corsHeaders })
    if (requestedEmail && !/^\S+@\S+\.\S+$/.test(requestedEmail)) return Response.json({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }, { headers: corsHeaders })
    const username = await uniqueUsername(admin, requestedUsername, displayName, requestedEmail)
    if (!username) return Response.json({ error: 'Für diesen Namen konnte kein gültiger Benutzername erzeugt werden.' }, { headers: corsHeaders })
    const email = requestedEmail || `${username}@tct-intern.invalid`
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) return Response.json({ error: error?.message ?? 'Konto konnte nicht erstellt werden.' }, { headers: corsHeaders })
    const profilePayload = { id: data.user.id, display_name: displayName || null, username, login_email: email, role, must_change_password: true }
    const { error: profileError } = await admin.from('profiles').upsert(profilePayload)
    if (profileError) { await admin.auth.admin.deleteUser(data.user.id); return Response.json({ error: profileError.message }, { headers: corsHeaders }) }
    await writeUserAudit('INSERT', data.user.id, null, safeProfile(profilePayload))
    return Response.json({ ok: true, username, usesInternalEmail: !requestedEmail }, { headers: corsHeaders })
  }
  if (body.action === 'role') {
    const { data: beforeProfile } = await admin.from('profiles').select('id,display_name,username,login_email,role').eq('id', body.userId).maybeSingle()
    const { data: afterProfile, error } = await admin.from('profiles').update({ role: body.role }).eq('id', body.userId).select('id,display_name,username,login_email,role').maybeSingle()
    if (!error) await writeUserAudit('UPDATE', body.userId, safeProfile(beforeProfile), safeProfile(afterProfile))
    return Response.json(error ? { error: error.message } : { ok: true }, { headers: corsHeaders })
  }
  if (body.action === 'delete') {
    if (body.userId === user.id) return Response.json({ error: 'Du kannst deinen eigenen Zugang nicht löschen.' }, { headers: corsHeaders })
    const { data: target } = await admin.from('profiles').select('id,display_name,username,login_email,role').eq('id', body.userId).maybeSingle()
    if (target?.login_email === ownerEmail) return Response.json({ error: 'Das Eigentümer-Konto kann nicht gelöscht werden.' }, { headers: corsHeaders })
    const { error } = await admin.auth.admin.deleteUser(body.userId)
    if (!error) await writeUserAudit('DELETE', body.userId, safeProfile(target), null)
    return Response.json(error ? { error: error.message } : { ok: true }, { headers: corsHeaders })
  }
  return Response.json({ error: 'Unbekannte Aktion.' }, { headers: corsHeaders })
})
