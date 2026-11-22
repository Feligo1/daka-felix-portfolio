export const PROJECT_STATUSES = ['Design', 'In progress', 'Prototype', 'Completed']
export const MEDIA_BUCKET = 'showcase-media'

export function githubRepository(value) {
    return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(value || '') ? value : ''
}

export function youtubeVideoId(value) {
    try {
        const url = new URL(value)
        if (url.protocol !== 'https:' || url.username || url.password || url.port) return ''
        const path = url.pathname.split('/')
        const id = url.hostname === 'youtu.be' ? path[1] :
            ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)
                ? path[1] === 'watch' ? url.searchParams.get('v') :
                    ['embed', 'shorts', 'live'].includes(path[1]) ? path[2] : ''
                : ''
        return /^[\w-]{11}$/.test(id || '') ? id : ''
    } catch {
        return ''
    }
}

export function projectLink(slug) {
    return 'project.html?' + new URLSearchParams({ project: slug })
}

export function orderedMedia(media = []) {
    return [...media].sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
}

export async function publishedProjects(client, { limit, slug } = {}) {
    let query = client.from('showcase_projects')
        .select(slug ? '*, showcase_media(*)' : 'id,slug,title,summary,category,status,technologies,showcase_media(id,path,kind,description,display_order)')
        .lte('published_at', new Date().toISOString())
        .order('featured', { ascending: false })
        .order('display_order')
        .order('published_at', { ascending: false })
        .order('id')
    if (slug) return query.eq('slug', slug).maybeSingle()
    if (limit) return query.limit(limit)
    const projects = []
    const pageSize = 100
    for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await query.range(offset, offset + pageSize - 1)
        if (error) return { error }
        projects.push(...data)
        if (data.length < pageSize) return { data: projects }
    }
}
