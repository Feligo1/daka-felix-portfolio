import { element, imagePath, journalImage, JOURNAL_BUCKET, JOURNAL_TOPICS, renderArticle, signedJournalImages } from './editorial-data.js'

const configurations = {
    journal: { table: 'journal_articles', title: 'title', fields: ['slug','title','summary','topic','body','tags'] },
    recommendations: { table: 'recommendations', title: 'person', fields: ['person','role','organization','quote','display_order'] }
}

function checked(result) {
    if (result.error) throw new Error(result.error.message)
    return result.data
}

export function setupEditorialAdmin(client, mode, optimizeImage, notify) {
    const config = configurations[mode]
    const journal = mode === 'journal'
    const panel = document.getElementById(mode + 'Tab')
    const editor = panel.querySelector('[data-editor]')
    const list = panel.querySelector('[data-records]')
    const preview = panel.querySelector('[data-preview]')
    const mediaPanel = panel.querySelector('#journalMediaPanel')
    const mediaForm = panel.querySelector('#journalImageForm')
    const mediaList = panel.querySelector('#journalImageList')
    const bucket = client.storage.from(JOURNAL_BUCKET)
    const records = () => client.from(config.table)
    const images = () => client.from('journal_images')
    let selected = null
    let busy = false

    if (journal) for (const topic of JOURNAL_TOPICS) editor.elements.topic.add(new Option(topic, topic))

    function button(label, fn) {
        const node = element('button', label)
        node.type = 'button'
        node.addEventListener('click', fn)
        return node
    }

    async function perform(operation) {
        if (busy) return
        busy = true
        panel.setAttribute('aria-busy', 'true')
        try { await operation() }
        catch (error) { notify(error.message, 'error') }
        finally { busy = false; panel.removeAttribute('aria-busy') }
    }

    function start(item) {
        selected = item
        editor.reset()
        preview.hidden = true
        if (journal) {
            editor.elements.slug.readOnly = Boolean(item)
            mediaPanel.hidden = !item
            mediaForm.reset()
        } else editor.elements.permission_confirmed.checked = Boolean(item?.permission_confirmed)
        if (item) for (const field of config.fields) editor.elements[field].value = field === 'tags' ? item.tags.join(', ') : item[field]
    }

    async function refreshMedia() {
        if (!selected || !journal) return
        const data = checked(await images().select('*').eq('article_id', selected.id).order('created_at'))
        mediaList.replaceChildren()
        if (!data.length) mediaList.textContent = 'No article images yet.'
        for (const image of data) {
            const row = element('div', '', 'item-row')
            row.append(element('p', (image.is_cover ? 'Cover: ' : 'Screenshot: ') + image.alt_text))
            row.append(button('Remove image', () => {
                if (!confirm('Remove this image?')) return
                perform(async () => {
                    checked(await images().delete().eq('id', image.id).select('id').single())
                    const cleanup = await bucket.remove([imagePath(image.id)])
                    await refreshMedia()
                    if (cleanup.error) throw new Error('Image removed from article. Clean up unlinked file ' + imagePath(image.id) + ' in Storage.')
                    notify('Image removed.')
                })
            }))
            mediaList.append(row)
        }
    }

    async function refresh() {
        const order = journal ? 'created_at' : 'display_order'
        const data = []
        for (let offset = 0; ; offset += 100) {
            const page = checked(await records().select('*').order(order, { ascending: !journal }).order('id').range(offset, offset + 99))
            data.push(...page)
            if (page.length < 100) break
        }
        const stat = document.getElementById(journal ? 'statJournal' : 'statRecommendations')
        if (stat) stat.textContent = data.length
        list.replaceChildren()
        if (!data.length) list.textContent = 'No records yet.'
        for (const item of data) {
            const row = element('div', '', 'item-row')
            const actions = element('div', '', 'item-actions')
            const published = Boolean(item.published_at)
            row.append(element('strong', item[config.title] + (published ? ' / Published' : ' / Draft')))
            actions.append(button('Edit', () => perform(async () => {
                start(item)
                editor.elements[config.title].focus()
                await refreshMedia()
            })), button(published ? 'Unpublish' : 'Publish', () => perform(async () => {
                if (!journal && !published && !item.permission_confirmed) throw new Error('Save confirmation of publication permission before publishing.')
                const changed = checked(await records().update({ published_at: published ? null : new Date().toISOString() }).eq('id', item.id).select('*').single())
                if (selected?.id === item.id) selected = changed
                await refresh()
                notify(published ? 'Unpublished.' : 'Published.')
            })), button('Delete', () => {
                if (!confirm('Delete this record?')) return
                perform(async () => {
                    const media = journal ? checked(await images().select('id').eq('article_id', item.id)) : []
                    checked(await records().delete().eq('id', item.id).select('id').single())
                    if (selected?.id === item.id) start(null)
                    const cleanup = media.length ? await bucket.remove(media.map(image => imagePath(image.id))) : null
                    await refresh()
                    if (cleanup?.error) throw new Error('Record deleted. Remove unlinked objects in Storage: ' + media.map(image => imagePath(image.id)).join(', '))
                    notify('Record deleted.')
                })
            }))
            row.append(actions)
            list.append(row)
        }
    }

    panel.querySelector('[data-new]').addEventListener('click', () => {
        if (busy) return
        start(null)
        editor.elements[config.title].focus()
    })
    editor.addEventListener('submit', event => {
        event.preventDefault()
        perform(async () => {
            const values = Object.fromEntries(config.fields.map(field => [field, editor.elements[field].value.trim()]))
            if (journal) {
                values.tags = values.tags.split(',').map(tag => tag.trim()).filter(Boolean)
                if (selected) delete values.slug
            } else {
                values.display_order = Number(values.display_order)
                values.permission_confirmed = editor.elements.permission_confirmed.checked
                if (!values.permission_confirmed) values.published_at = null
            }
            const query = selected ? records().update(values).eq('id', selected.id) : records().insert(values)
            const saved = checked(await query.select('*').single())
            start(saved)
            await refresh()
            await refreshMedia()
            notify(journal ? 'Article saved.' : 'Recommendation saved.')
        })
    })
    panel.querySelector('[data-preview-button]').addEventListener('click', () => perform(async () => {
        preview.replaceChildren(element('h3', editor.elements[config.title].value, 'editorial-meta'))
        if (journal) {
            const body = element('div', '', 'editorial-prose')
            preview.append(body)
            renderArticle(editor.elements.body.value, body)
            if (selected) {
                const media = checked(await images().select('*').eq('article_id', selected.id).order('created_at'))
                const links = await signedJournalImages(client, media)
                for (const item of media) {
                    const image = journalImage(item, links)
                    if (image) preview.append(image)
                }
            }
        } else {
            preview.append(element('blockquote', editor.elements.quote.value),
                element('p', [editor.elements.role.value, editor.elements.organization.value].filter(Boolean).join(', ')))
        }
        preview.hidden = false
        preview.focus()
    }))
    mediaForm?.addEventListener('submit', event => {
        event.preventDefault()
        perform(async () => {
            if (!selected) return
            const file = mediaForm.elements.file.files[0]
            const alt = mediaForm.elements.alt.value.trim()
            if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || !alt) throw new Error('Choose a JPEG, PNG or WebP and provide alt text.')
            const isCover = mediaForm.elements.cover.checked
            if (isCover && checked(await images().select('id').eq('article_id', selected.id).eq('is_cover', true)).length) {
                throw new Error('Remove the existing cover before uploading a new one.')
            }
            const photo = await optimizeImage(file)
            if (photo.type !== 'image/webp' || photo.size > 5 * 1024 * 1024) throw new Error('Optimized images must be WebP and smaller than 5 MiB.')
            const id = crypto.randomUUID()
            const path = imagePath(id)
            checked(await bucket.upload(path, photo, { contentType: 'image/webp', upsert: false }))
            const result = await images().insert({ id, article_id: selected.id, alt_text: alt, is_cover: isCover })
            if (result.error) {
                const cleanup = await bucket.remove([path])
                if (cleanup.error) throw new Error('Remove unlinked file ' + path + ' from Storage.')
                checked(result)
            }
            mediaForm.reset()
            await refreshMedia()
            notify('Image attached.')
        })
    })
    return () => perform(async () => {
        try { await refresh() }
        catch (error) { list.textContent = 'Could not load records. Check the editorial migration and admin access.'; throw error }
    })
}
