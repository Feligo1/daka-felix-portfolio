export const JOURNAL_TOPICS = ['Networking', 'Cybersecurity', 'Programming', 'Cloud', 'IT Support', 'Project Updates']
export const JOURNAL_BUCKET = 'journal-images'
export const articleLink = slug => 'article.html?' + new URLSearchParams({ article: slug })
export const imagePath = id => id + '.webp'

export function element(tag, text, className) {
    const node = document.createElement(tag)
    if (text) node.textContent = text
    if (className) node.className = className
    return node
}

export function httpsLink(value) {
    try {
        if (!/^https:\/\//i.test(value)) return ''
        const url = new URL(value)
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''
    } catch {
        return ''
    }
}

export function publicationDate(value) {
    return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value)) : ''
}

export function journalMeta(article) {
    const minutes = article.reading_minutes || Math.max(1, Math.ceil((article.body || '').trim().split(/\s+/).length / 200))
    return [article.topic, 'Felix Daka', publicationDate(article.published_at), minutes + ' min read'].filter(Boolean).join(' / ')
}

function inlineText(parent, text) {
    const tokens = /\[([^\]\n]+)\]\(([^\s)]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*/g
    let offset = 0
    for (const token of text.matchAll(tokens)) {
        parent.append(text.slice(offset, token.index))
        const url = token[1] && httpsLink(token[2])
        if (url) {
            const link = element('a', token[1])
            link.href = url
            parent.append(link)
        } else if (token[3]) parent.append(element('code', token[3]))
        else if (token[4]) parent.append(element('strong', token[4]))
        else parent.append(token[0])
        offset = token.index + token[0].length
    }
    parent.append(text.slice(offset))
}

// Supported syntax is deliberately small. All user content becomes text or sanitized links.
export function renderArticle(body, target) {
    target.replaceChildren()
    let code = null
    let paragraph = []
    let list = null
    function flushParagraph() {
        if (!paragraph.length) return
        const p = element('p')
        inlineText(p, paragraph.join(' '))
        target.append(p)
        paragraph = []
    }
    for (const line of body.split(/\r?\n/)) {
        if (line.startsWith('```')) {
            flushParagraph()
            list = null
            if (code) {
                const pre = element('pre')
                pre.append(element('code', code.join('\n')))
                target.append(pre)
                code = null
            } else code = []
            continue
        }
        if (code) { code.push(line); continue }
        if (!line.trim()) { flushParagraph(); list = null; continue }
        if (/^#{1,3} /.test(line)) {
            flushParagraph()
            list = null
            const marker = line.indexOf(' ')
            const heading = element(marker === 3 ? 'h3' : 'h2')
            inlineText(heading, line.slice(marker + 1))
            target.append(heading)
        } else if (/^[-*] /.test(line)) {
            flushParagraph()
            if (!list) { list = element('ul'); target.append(list) }
            const item = element('li')
            inlineText(item, line.slice(2))
            list.append(item)
        } else {
            list = null
            paragraph.push(line)
        }
    }
    flushParagraph()
    if (code) {
        const pre = element('pre')
        pre.append(element('code', code.join('\n')))
        target.append(pre)
    }
}

export async function signedJournalImages(client, images) {
    const links = new Map()
    const paths = [...new Set(images.map(image => imagePath(image.id)))]
    for (let offset = 0; offset < paths.length; offset += 100) {
        const { data } = await client.storage.from(JOURNAL_BUCKET).createSignedUrls(paths.slice(offset, offset + 100), 900)
        for (const item of data || []) if (item.signedUrl) links.set(item.path, item.signedUrl)
    }
    return links
}

export function journalImage(image, links) {
    const url = image && links.get(imagePath(image.id))
    if (!url) return null
    const img = element('img', '', 'editorial-photo')
    img.src = url
    img.alt = image.alt_text
    img.loading = 'lazy'
    img.decoding = 'async'
    return img
}
