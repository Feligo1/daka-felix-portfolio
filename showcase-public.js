import { httpsLink } from './editorial-data.js'
import { githubRepository, MEDIA_BUCKET, orderedMedia, projectLink, PROJECT_STATUSES, publishedProjects } from './showcase-data.js'

function element(tag, text, className) {
    const node = document.createElement(tag)
    if (text) node.textContent = text
    if (className) node.className = className
    return node
}

async function signedFiles(client, media) {
    const paths = [...new Set(media.map(item => item?.path).filter(Boolean))]
    if (!paths.length) return new Map()
    const { data } = await client.storage.from(MEDIA_BUCKET).createSignedUrls(paths, 900)
    return new Map((data || []).filter(file => file.signedUrl).map(file => [file.path, file.signedUrl]))
}

function projectCard(project, links) {
    const card = element('article', '', 'showcase-card')
    const cover = orderedMedia(project.showcase_media).find(item => item.kind === 'image')
    if (links.has(cover?.path)) {
        const image = element('img', '', 'showcase-cover')
        image.src = links.get(cover.path)
        image.alt = cover.description
        image.loading = 'lazy'
        image.decoding = 'async'
        card.append(image)
    }
    const body = element('div', '', 'showcase-card-body')
    body.append(element('p', project.category + ' / ' + project.status, 'showcase-status'))
    const heading = element('h3')
    const link = element('a', project.title)
    link.href = projectLink(project.slug)
    heading.append(link)
    body.append(heading, element('p', project.summary))
    if (project.technologies?.length) body.append(element('p', project.technologies.join(' / '), 'showcase-status'))
    card.append(body)
    return card
}

async function renderListings(client, listing) {
    const gallery = listing.id === 'projectsGrid'
    const { data, error } = await publishedProjects(client, gallery ? {} : { limit: 3 })
    if (error) throw error
    const status = document.getElementById('projectResultsStatus')
    const filterForm = document.getElementById('projectFilters')
    if (filterForm) {
        const category = filterForm.elements.category
        for (const name of [...new Set(data.map(project => project.category))].sort()) category.add(new Option(name, name))
        const state = filterForm.elements.status
        for (const name of PROJECT_STATUSES) state.add(new Option(name, name))
        filterForm.hidden = !data.length
    }
    let version = 0
    async function render() {
        const current = ++version
        const filters = filterForm?.elements
        const term = filters?.search.value.trim().toLowerCase()
        const matches = data.filter(project =>
            (!filters?.category.value || project.category === filters.category.value) &&
            (!filters?.status.value || project.status === filters.status.value) &&
            (!term || (project.title + ' ' + project.summary).toLowerCase().includes(term)))
        const cards = matches.slice(0, gallery ? (Number(listing.dataset.limit) || 12) : 3)
        const links = await signedFiles(client, cards.map(project => orderedMedia(project.showcase_media).find(item => item.kind === 'image')))
        if (current !== version) return
        listing.replaceChildren(...cards.map(project => projectCard(project, links)))
        if (!data.length) status.textContent = 'No projects have been published yet.'
        else if (!matches.length) status.textContent = 'No projects match these filters.'
        else status.textContent = gallery ? 'Showing ' + cards.length + ' of ' + matches.length + ' projects' : ''
        const more = document.getElementById('showMoreProjects')
        if (more) more.hidden = cards.length >= matches.length
    }
    const update = () => {
        listing.dataset.limit = '12'
        render().catch(() => { status.textContent = 'Projects could not be loaded.' })
    }
    filterForm?.addEventListener('input', update)
    filterForm?.addEventListener('submit', event => event.preventDefault())
    document.getElementById('showMoreProjects')?.addEventListener('click', () => {
        listing.dataset.limit = String((Number(listing.dataset.limit) || 12) + 12)
        render().catch(() => { status.textContent = 'Projects could not be loaded.' })
    })
    await render()
}

function section(title, content) {
    if (!content?.length) return null
    const block = element('section', '', 'case-section')
    block.append(element('h2', title))
    if (Array.isArray(content)) {
        const list = element('ul')
        list.append(...content.map(value => element('li', value)))
        block.append(list)
    } else block.append(element('p', content))
    return block
}

function setupLightbox() {
    const dialog = document.getElementById('projectLightbox')
    dialog.querySelector('button').addEventListener('click', () => dialog.close())
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
    return (url, description) => {
        const image = dialog.querySelector('img')
        image.src = url
        image.alt = description
        dialog.querySelector('figcaption').textContent = description
        dialog.showModal()
    }
}

async function renderDetail(client, detail) {
    const slug = new URLSearchParams(location.search).get('project')
    const message = document.getElementById('projectResultsStatus')
    if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
        message.textContent = 'Choose a project from the gallery.'
        return
    }
    const { data: project, error } = await publishedProjects(client, { slug })
    if (error) throw error
    if (!project) {
        message.textContent = 'This project is unavailable.'
        return
    }
    document.title = project.title + ' | Felix Daka'
    document.getElementById('caseTitle').textContent = project.title
    document.getElementById('caseStatus').textContent = project.category + ' / ' + project.status
    message.textContent = project.summary
    const blocks = [
        section('Overview', project.overview),
        section('Problem', project.problem),
        section('Objectives', project.objectives),
        section('Technologies', project.technologies),
        section('Architecture', project.architecture),
        section('Implemented features', project.features),
        section('Proposed features', project.proposed_features),
        section('Challenges', project.challenges),
        section('Outcomes', project.outcomes),
        section('Lessons learned', project.lessons)
    ].filter(Boolean)
    detail.append(...blocks)
    const repository = githubRepository(project.github_url)
    if (repository) {
        const link = element('a', 'View source on GitHub', 'showcase-action')
        link.href = repository
        detail.append(link)
    }
    const demo = httpsLink(project.live_url)
    if (demo) {
        const link = element('a', 'Open live demo', 'showcase-action')
        link.href = demo
        detail.append(link)
    }
    const media = orderedMedia(project.showcase_media)
    if (!media.length) return
    const links = await signedFiles(client, media)
    const openImage = setupLightbox()
    const grid = element('div', '', 'showcase-media-grid')
    for (const item of media) {
        const url = links.get(item.path)
        let content
        if (item.kind === 'image' && url) {
            content = element('button', '', 'showcase-image-button')
            content.type = 'button'
            content.setAttribute('aria-label', 'Enlarge image: ' + item.description)
            const image = element('img')
            image.src = url
            image.loading = 'lazy'
            image.alt = item.description
            content.append(image)
            content.addEventListener('click', () => openImage(url, item.description))
        } else if (item.kind === 'video' && url) {
            content = element('video')
            content.src = url
            content.controls = true
            content.preload = 'none'
            content.playsInline = true
            content.setAttribute('aria-label', item.description)
        } else if (item.kind === 'youtube' && /^[\w-]{11}$/.test(item.youtube_id || '')) {
            content = element('iframe')
            content.src = 'https://www.youtube-nocookie.com/embed/' + item.youtube_id
            content.title = item.description
            content.loading = 'lazy'
            content.allowFullscreen = true
            content.referrerPolicy = 'strict-origin-when-cross-origin'
        }
        if (!content) continue
        const figure = element('figure')
        figure.append(content, element('figcaption', item.description))
        grid.append(figure)
    }
    if (grid.childElementCount) {
        const block = element('section', '', 'case-section')
        block.append(element('h2', 'Screenshots and demos'), grid)
        detail.append(block)
    }
    if (grid.childElementCount < media.length) detail.append(element('p', 'Some project media is currently unavailable.'))
}

const listing = document.querySelector('[data-showcase-list]')
const detail = document.getElementById('projectDetail')
if (listing || detail) {
    try {
        const { supabase, trackDeviceVisit } = await import('./supabase-client.js')
        if (detail || listing.id === 'projectsGrid') trackDeviceVisit()
        if (listing) await renderListings(supabase, listing)
        else await renderDetail(supabase, detail)
    } catch {
        document.getElementById('projectResultsStatus').textContent = 'Project information could not be loaded. Please try again later.'
    }
}
