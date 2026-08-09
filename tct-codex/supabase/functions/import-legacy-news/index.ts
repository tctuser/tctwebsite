import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const legacyApi = 'https://tennisclub-trier.de/wp-json/wp/v2/posts?per_page=100&_embed'

type LegacyPost = {
  id: number
  link: string
  date: string
  title: { rendered: string }
  content: { rendered: string }
  excerpt: { rendered: string }
  _embedded?: { 'wp:featuredmedia'?: Array<{ source_url?: string }> }
}

const decode = (value: string) => value
  .replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&#8211;/g, '–').replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#039;/g, "'")

const plainText = (html: string) => decode(html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<\/(p|h[1-6]|li|div|section)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim())

const imageUrls = (post: LegacyPost) => {
  const matches = [...post.content.rendered.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1])
  const featured = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
  return [...new Set([featured, ...matches].filter((url): url is string => Boolean(url)))]
}

const filename = (url: string, fallback: string) => {
  const raw = url.split('?')[0].split('/').pop() || fallback
  return raw.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return Response.json({ error: 'Nicht angemeldet.' }, { headers: corsHeaders })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!['management', 'admin', 'editor', 'content_manager'].includes(profile?.role ?? '')) return Response.json({ error: 'Deine Rolle darf keine News übernehmen.' }, { headers: corsHeaders })

    const response = await fetch(legacyApi)
    if (!response.ok) return Response.json({ error: 'Das bisherige News-Archiv konnte nicht gelesen werden.' }, { headers: corsHeaders })
    const posts = await response.json() as LegacyPost[]
    const { data: existingGallery } = await admin.from('club_content').select('value').eq('key', 'legacy_news_images').maybeSingle()
    const galleries: Record<string, string[]> = existingGallery?.value?.items && typeof existingGallery.value.items === 'object' ? existingGallery.value.items : {}
    let imported = 0
    let images = 0

    for (const post of posts) {
      const sourceId = `legacy-wordpress:${post.id}`
      const { data: exists } = await admin.from('news').select('id').eq('source_url', sourceId).maybeSingle()
      if (exists) continue

      const imageMap = new Map<string, string>()
      for (const [index, source] of imageUrls(post).entries()) {
        try {
          const imageResponse = await fetch(source)
          if (!imageResponse.ok) continue
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
          if (!contentType.startsWith('image/')) continue
          const path = `legacy-news/${post.id}/${String(index + 1).padStart(2, '0')}-${filename(source, `bild-${index + 1}.jpg`)}`
          const { error: uploadError } = await admin.storage.from('club-media').upload(path, new Uint8Array(await imageResponse.arrayBuffer()), { contentType, upsert: true })
          if (uploadError) continue
          const { data: publicUrl } = admin.storage.from('club-media').getPublicUrl(path)
          imageMap.set(source, publicUrl.publicUrl)
          images += 1
        } catch { /* Eine defekte Alt-Datei darf die übrige Übernahme nicht stoppen. */ }
      }

      const body = plainText(post.content.rendered)
      const cover = imageMap.get(imageUrls(post)[0]) ?? null
      const { data: inserted, error: insertError } = await admin.from('news').insert({
        title: plainText(post.title.rendered) || `Vereinsnews ${post.id}`,
        excerpt: plainText(post.excerpt.rendered).slice(0, 500) || body.slice(0, 500) || null,
        body: body || null,
        image_path: cover,
        source_url: sourceId,
        status: 'published',
        published_at: new Date(post.date).toISOString(),
      }).select('id').single()
      if (!insertError && inserted) {
        galleries[inserted.id] = [...imageMap.values()]
        imported += 1
      }
    }
    await admin.from('club_content').upsert({ key: 'legacy_news_images', value: { items: galleries }, updated_by: user.id })
    return Response.json({ ok: true, imported, images }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der News-Übernahme.' }, { headers: corsHeaders })
  }
})
