import { GALLERY_BUCKET, GALLERY_CATEGORIES, photoDate, photoPath } from './about-gallery-data.js'

const grid = document.getElementById('aboutGalleryGrid')
const filters = document.getElementById('aboutGalleryFilters')
const status = document.getElementById('aboutGalleryStatus')
const dialog = document.getElementById('aboutPhotoDialog')
const dialogImage = dialog.querySelector('img')
const dialogTitle = document.getElementById('aboutPhotoTitle')
const dialogCaption = document.getElementById('aboutPhotoCaption')
const dialogPosition = document.getElementById('aboutPhotoPosition')
const previous = document.getElementById('aboutPhotoPrevious')
const next = document.getElementById('aboutPhotoNext')
let activeCategory = 'All'
let photos = []
let visible = []
let index = 0
let opener
let storage
let ready = false
let unavailable = false

function node(tag, text) {
    const element = document.createElement(tag)
    if (text) element.textContent = text
    return element
}

function showPhoto(position) {
    index = (position + visible.length) % visible.length
    const photo = visible[index]
    dialogImage.alt = photo.alt_text
    dialogImage.src = photo.url
    dialogTitle.textContent = photo.title
    dialogCaption.textContent = [photoDate(photo.photo_date), photo.description].filter(Boolean).join(' / ')
    dialogPosition.textContent = (index + 1) + ' of ' + visible.length
    previous.disabled = next.disabled = visible.length < 2
}

function photoCard(photo, position) {
    const figure = node('figure')
    const button = node('button')
    button.type = 'button'
    button.setAttribute('aria-label', 'View photo: ' + photo.title)
    const image = node('img')
    image.src = photo.url
    image.alt = photo.alt_text
    image.width = photo.width
    image.height = photo.height
    image.loading = 'lazy'
    image.decoding = 'async'
    const caption = node('figcaption')
    caption.append(node('strong', photo.title))
    const label = [photo.category, photoDate(photo.photo_date)].filter(Boolean).join(' / ')
    caption.append(node('span', label))
    button.append(image)
    figure.append(button, caption)
    button.addEventListener('click', () => {
        opener = button
        showPhoto(position)
        dialog.showModal()
    })
    return figure
}

let renderVersion = 0
async function render() {
    if (!ready) return
    const version = ++renderVersion
    const matches = photos.filter(photo => activeCategory === 'All' || photo.category === activeCategory)
    grid.replaceChildren()
    visible = []
    if (unavailable) {
        status.textContent = 'The photo gallery is currently unavailable.'
        return
    }
    if (!matches.length) {
        status.textContent = activeCategory === 'All' ? 'No photographs have been published yet.' : 'No photographs have been published in ' + activeCategory + ' yet.'
        return
    }
    status.textContent = 'Loading photographs...'
    const batchSize = 100
    const urls = new Map()
    for (let offset = 0; offset < matches.length; offset += batchSize) {
        const { data } = await storage.createSignedUrls(matches.slice(offset, offset + batchSize).map(photo => photoPath(photo.id)), 900)
        for (const file of data || []) if (file.signedUrl) urls.set(file.path, file.signedUrl)
        if (version !== renderVersion) return
    }
    visible = matches.filter(photo => urls.has(photoPath(photo.id))).map(photo => ({ ...photo, url: urls.get(photoPath(photo.id)) }))
    grid.replaceChildren(...visible.map(photoCard))
    status.textContent = visible.length === matches.length ? '' : 'Some photographs are currently unavailable.'
}

function reportUnavailable() {
    unavailable = true
    ready = true
    render()
}

for (const category of ['All', ...GALLERY_CATEGORIES]) {
    const button = node('button', category)
    button.type = 'button'
    button.setAttribute('aria-pressed', String(category === activeCategory))
    button.addEventListener('click', () => {
        activeCategory = category
        for (const filter of filters.querySelectorAll('button')) filter.setAttribute('aria-pressed', String(filter === button))
        render().catch(reportUnavailable)
    })
    filters.append(button)
}
previous.addEventListener('click', () => showPhoto(index - 1))
next.addEventListener('click', () => showPhoto(index + 1))
dialog.querySelector('[data-close-photo]').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
dialog.addEventListener('close', () => opener?.focus())
dialog.addEventListener('keydown', event => {
    if (visible.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    showPhoto(index + (event.key === 'ArrowLeft' ? -1 : 1))
})

try {
    const { supabase, trackDeviceVisit } = await import('./supabase-client.js')
    trackDeviceVisit()
    const portrait = document.getElementById('aboutPageImage')
    supabase.from('site_settings').select('setting_value').eq('setting_key', 'about_image_url').maybeSingle()
        .then(({ data }) => {
            if (!data?.setting_value) return
            const fallback = portrait.src
            portrait.addEventListener('error', () => { portrait.src = fallback }, { once: true })
            portrait.src = data.setting_value
        })
    storage = supabase.storage.from(GALLERY_BUCKET)
    for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.from('about_gallery').select('id,title,category,photo_date,description,alt_text,width,height')
            .lte('published_at', new Date().toISOString()).order('display_order').order('created_at', { ascending: false }).order('id').range(offset, offset + 99)
        if (error) {
            if (['PGRST205', '42P01'].includes(error.code)) break
            throw error
        }
        photos.push(...data)
        if (data.length < 100) break
    }
    ready = true
    await render()
} catch {
    reportUnavailable()
}
