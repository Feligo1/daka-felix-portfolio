import { GALLERY_BUCKET, GALLERY_CATEGORIES, photoDate, photoPath } from './about-gallery-data.js'

export function setupGalleryAdmin(client, optimizeImage, notify) {
    const panel = document.getElementById('galleryTab')
    const form = panel.querySelector('form')
    const list = panel.querySelector('#galleryAdminList')
    const preview = panel.querySelector('#galleryAdminPreview')
    const input = form.elements.photo
    const save = form.querySelector('[type=submit]')
    const bucket = client.storage.from(GALLERY_BUCKET)
    const records = () => client.from('about_gallery')
    const fields = ['title', 'category', 'photo_date', 'description', 'alt_text', 'display_order']
    let selected = null
    let busy = false
    let previewUrl

    for (const category of GALLERY_CATEGORIES) form.elements.category.add(new Option(category, category))

    function checked(result) {
        if (result.error) throw new Error(result.error.message)
        return result.data
    }

    function action(label, run) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = label
        button.addEventListener('click', run)
        return button
    }

    async function perform(operation) {
        if (busy) return
        busy = true
        panel.setAttribute('aria-busy', 'true')
        save.disabled = true
        try {
            await operation()
        } catch (error) {
            notify(error.message, 'error')
        } finally {
            save.disabled = false
            busy = false
            panel.removeAttribute('aria-busy')
        }
    }

    function edit(photo) {
        if (busy) return
        resetEditor(photo)
        form.elements.title.focus()
    }

    function resetEditor(photo) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        preview.replaceChildren()
        preview.hidden = true
        selected = photo
        form.reset()
        input.required = !photo
        input.disabled = Boolean(photo)
        input.closest('label').hidden = Boolean(photo)
        panel.querySelector('#galleryEditorTitle').textContent = photo ? 'Edit photo details' : 'Add photo'
        if (photo) for (const field of fields) form.elements[field].value = photo[field] ?? ''
    }

    async function refresh() {
        const photos = []
        for (let offset = 0; ; offset += 100) {
            const page = checked(await records().select('*').order('display_order').order('created_at', { ascending: false }).order('id').range(offset, offset + 99))
            photos.push(...page)
            if (page.length < 100) break
        }
        list.replaceChildren()
        if (!photos.length) list.textContent = 'No photos have been added.'
        for (const photo of photos) {
            const row = document.createElement('div')
            row.className = 'item-row'
            const info = document.createElement('div')
            const title = document.createElement('strong')
            title.textContent = photo.title
            const details = document.createElement('p')
            details.textContent = [photo.category, photoDate(photo.photo_date), photo.published_at ? 'Published' : 'Draft', 'Order ' + photo.display_order].filter(Boolean).join(' / ')
            info.append(title, details)
            const actions = document.createElement('div')
            actions.className = 'item-actions'
            actions.append(action('Edit', () => edit(photo)), action(photo.published_at ? 'Unpublish' : 'Publish', () => perform(async () => {
                checked(await records().update({ published_at: photo.published_at ? null : new Date().toISOString() }).eq('id', photo.id).select('id').single())
                await refresh()
                notify(photo.published_at ? 'Photo unpublished.' : 'Photo published.')
            })), action('Delete', () => {
                if (busy || !confirm('Delete this photograph and its caption?')) return
                perform(async () => {
                    checked(await records().delete().eq('id', photo.id).select('id').single())
                    if (selected?.id === photo.id) resetEditor(null)
                    const cleanup = await bucket.remove([photoPath(photo.id)])
                    await refresh()
                    if (cleanup.error) throw new Error('Photo record deleted. Remove the unlinked file in Supabase Storage: ' + photoPath(photo.id))
                    notify('Photo deleted.')
                })
            }))
            row.append(info, actions)
            list.append(row)
        }
    }

    form.addEventListener('submit', event => {
        event.preventDefault()
        perform(async () => {
            const values = Object.fromEntries(fields.map(field => [field, form.elements[field].value.trim()]))
            values.photo_date ||= null
            values.display_order = Number(values.display_order)
            if (!values.title || !values.alt_text) throw new Error('Enter a title and image description.')
            if (selected) {
                checked(await records().update(values).eq('id', selected.id).select('id').single())
            } else {
                const file = input.files[0]
                if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photograph.')
                const optimized = await optimizeImage(file)
                if (optimized.type !== 'image/webp' || optimized.size > 5 * 1024 * 1024) throw new Error('The optimized WebP must be under 5 MiB.')
                const bitmap = await createImageBitmap(optimized)
                const { width, height } = bitmap
                bitmap.close()
                const id = crypto.randomUUID()
                const path = photoPath(id)
                checked(await bucket.upload(path, optimized, { contentType: 'image/webp', upsert: false }))
                const result = await records().insert({ ...values, id, width, height })
                if (result.error) {
                    const cleanup = await bucket.remove([path])
                    if (cleanup.error) throw new Error('Photo record could not be saved. Remove unlinked file ' + path + ' from Supabase Storage.')
                    checked(result)
                }
            }
            resetEditor(null)
            await refresh()
            notify('Photo saved.')
        })
    })
    panel.querySelector('#newGalleryPhoto').addEventListener('click', () => edit(null))
    panel.querySelector('#previewGalleryPhoto').addEventListener('click', () => perform(async () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        let url
        if (selected) {
            const file = checked(await bucket.createSignedUrl(photoPath(selected.id), 900))
            url = file.signedUrl
        } else {
            if (!input.files.length) throw new Error('Choose a photo to preview.')
            url = previewUrl = URL.createObjectURL(await optimizeImage(input.files[0]))
        }
        const image = document.createElement('img')
        image.src = url
        image.alt = form.elements.alt_text.value.trim()
        image.className = 'editorial-photo'
        const caption = document.createElement('p')
        caption.textContent = [form.elements.title.value, photoDate(form.elements.photo_date.value),
            form.elements.description.value].filter(Boolean).join(' / ')
        preview.replaceChildren(image, caption)
        preview.hidden = false
        preview.focus()
    }))

    return () => perform(async () => {
        try {
            await refresh()
        } catch (error) {
            list.textContent = 'Gallery could not be loaded. Check the gallery migration and your admin access.'
            throw error
        }
    })
}
