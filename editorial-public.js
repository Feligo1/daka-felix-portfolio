import { articleLink, element, journalImage, journalMeta, JOURNAL_TOPICS, renderArticle, signedJournalImages } from './editorial-data.js'

const root = document.querySelector('[data-editorial]')
const status = document.getElementById('editorialStatus')
const mode = root.dataset.editorial
const fields = 'id,slug,title,summary,topic,reading_minutes,tags,published_at,journal_images(id,alt_text,is_cover,created_at)'

function card(article, links) {
    const section = element('article', '', 'editorial-card')
    const cover = journalImage(article.journal_images.find(image => image.is_cover), links)
    if (cover) section.append(cover)
    const content = element('div', '', 'editorial-card-content')
    const heading = element(mode === 'home' ? 'h3' : 'h2')
    const link = element('a', article.title)
    link.href = articleLink(article.slug)
    heading.append(link)
    content.append(element('p', journalMeta(article), 'editorial-meta'), heading, element('p', article.summary))
    if (article.tags.length) content.append(element('p', article.tags.join(' / '), 'editorial-tags'))
    section.append(content)
    return section
}

function articleQuery(client, detail = false) {
    return client.from('journal_articles').select(fields + (detail ? ',body' : '')).lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false }).order('id')
}

async function showList(client) {
    const articles = []
    const query = articleQuery(client)
    const batch = mode === 'home' ? 1 : 50
    for (let offset = 0; ; offset += batch) {
        const { data, error } = await query.range(offset, offset + batch - 1)
        if (error) throw error
        articles.push(...data)
        if (mode === 'home' || data.length < batch) break
    }
    const filters = document.getElementById('journalFilters')
    if (filters) {
        for (const topic of JOURNAL_TOPICS) filters.elements.topic.add(new Option(topic, topic))
        filters.hidden = !articles.length
    }
    let version = 0
    async function render() {
        const current = ++version
        const text = filters?.elements.search.value.trim().toLowerCase()
        const topic = filters?.elements.topic.value
        const matches = articles.filter(article => (!topic || topic === article.topic) &&
            (!text || [article.title, article.summary, ...article.tags].join(' ').toLowerCase().includes(text)))
        const links = await signedJournalImages(client, matches.flatMap(article => article.journal_images.filter(image => image.is_cover)))
        if (current !== version) return
        root.replaceChildren(...matches.map(article => card(article, links)))
        status.textContent = matches.length ? '' : articles.length ? 'No articles match those filters.' : 'No journal articles have been published yet.'
    }
    filters?.addEventListener('input', () => render().catch(() => { status.textContent = 'Journal articles could not be loaded.' }))
    filters?.addEventListener('submit', event => event.preventDefault())
    await render()
}

async function showArticle(client) {
    const slug = new URLSearchParams(location.search).get('article')
    if (!slug || slug.length > 100 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        status.textContent = 'Choose an article from the journal.'
        return
    }
    const { data: article, error } = await articleQuery(client, true).eq('slug', slug).maybeSingle()
    if (error) throw error
    if (!article) { status.textContent = 'This article is unavailable.'; return }
    document.title = article.title + ' | Felix Daka'
    document.getElementById('articleTitle').textContent = article.title
    document.getElementById('articleMeta').textContent = journalMeta(article)
    status.textContent = article.summary
    const body = element('div', '', 'editorial-prose')
    renderArticle(article.body, body)
    root.replaceChildren(body)
    if (article.tags.length) root.append(element('p', article.tags.join(' / '), 'editorial-tags'))
    const images = [...article.journal_images].sort((a, b) => a.created_at.localeCompare(b.created_at))
    const links = await signedJournalImages(client, images)
    const cover = journalImage(images.find(image => image.is_cover), links)
    if (cover) root.prepend(cover)
    const screenshots = images.filter(image => !image.is_cover && links.has(image.id + '.webp'))
    if (screenshots.length) {
        const section = element('section', '', 'editorial-screenshots')
        const gallery = element('div', '', 'showcase-media-grid')
        section.append(element('h2', 'Screenshots'), gallery)
        for (const photo of screenshots) {
            const figure = element('figure')
            figure.append(journalImage(photo, links), element('figcaption', photo.alt_text))
            gallery.append(figure)
        }
        root.append(section)
    }
}

async function showRecommendations(client) {
    const { data, error } = await client.from('recommendations').select('person,role,organization,quote')
        .eq('permission_confirmed', true).lte('published_at', new Date().toISOString()).order('display_order').order('id')
    if (error) throw error
    for (const item of data) {
        const figure = element('figure', '', 'editorial-quote')
        const quote = element('blockquote')
        quote.append(element('p', item.quote))
        const caption = element('figcaption')
        caption.append(element('strong', item.person), element('span', [item.role, item.organization].filter(Boolean).join(', ')))
        figure.append(quote, caption)
        root.append(figure)
    }
    status.textContent = data.length ? '' : 'No recommendations are currently approved for publication.'
}

try {
    const { supabase, trackDeviceVisit } = await import('./supabase-client.js')
    if (mode !== 'home') trackDeviceVisit()
    if (mode === 'article') await showArticle(supabase)
    else if (mode === 'recommendations') await showRecommendations(supabase)
    else await showList(supabase)
} catch {
    status.textContent = 'This content is currently unavailable.'
}
