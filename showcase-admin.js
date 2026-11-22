import { element, httpsLink } from './editorial-data.js'
import { githubRepository, MEDIA_BUCKET, orderedMedia, PROJECT_STATUSES, youtubeVideoId } from './showcase-data.js'

const uploadTypes = {
    'image/jpeg': ['image', 'jpg'], 'image/png': ['image', 'png'], 'image/webp': ['image', 'webp'],
    'video/mp4': ['video', 'mp4'], 'video/webm': ['video', 'webm']
}

function check(result) {
    if (result.error) throw new Error(result.error.message)
    return result.data
}

function action(label, run, className = '') {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.className = className
    button.addEventListener('click', run)
    return button
}

export function setupShowcaseAdmin(client, notify) {
    const root = document.getElementById('showcaseAdmin')
    const form = root.querySelector('#showcaseProjectForm')
    const upload = root.querySelector('#showcaseUpload')
    const embed = root.querySelector('#showcaseEmbed')
    const list = root.querySelector('#showcaseAdminList')
    const mediaList = root.querySelector('#showcaseAdminMedia')
    const mediaPanel = root.querySelector('#showcaseMediaPanel')
    const filePicker = upload.elements.files
    const fileFields = root.querySelector('#showcaseFileFields')
    const bucket = client.storage.from(MEDIA_BUCKET)
    const records = () => client.from('showcase_projects')
    const attachments = () => client.from('showcase_media')
    const listFields = ['objectives', 'technologies', 'features', 'proposed_features']
    const textFields = ['slug', 'title', 'summary', 'category', 'status', 'overview', 'problem', 'architecture', 'challenges', 'outcomes', 'lessons', 'github_url', 'live_url']
    let selected = null
    let busy = false
    let loadVersion = 0

    for (const status of PROJECT_STATUSES) form.elements.status.add(new Option(status, status))

    async function perform(operation) {
        if (busy) return
        busy = true
        root.inert = true
        try {
            await operation()
        } catch (error) {
            notify(error.message || 'Project operation failed.', 'error')
        } finally {
            root.inert = false
            busy = false
        }
    }

    function renderMedia() {
        const items = orderedMedia(selected?.showcase_media)
        mediaList.replaceChildren()
        for (const item of items) {
            const row = document.createElement('div')
            row.className = 'showcase-admin-attachment'
            const label = document.createElement('label')
            label.textContent = item.kind === 'youtube' ? 'YouTube description' : item.kind + ' description'
            const description = document.createElement('input')
            description.value = item.description
            description.required = true
            description.maxLength = 300
            label.append(description)
            const orderLabel = document.createElement('label')
            orderLabel.textContent = 'Media order'
            const order = document.createElement('input')
            order.type = 'number'
            order.step = '1'
            order.required = true
            order.value = item.display_order
            orderLabel.append(order)
            row.append(label, orderLabel,
                action('Save media details', () => perform(async () => {
                    if (!description.reportValidity() || !order.reportValidity()) return
                    check(await attachments().update({
                        description: description.value.trim(), display_order: Number(order.value)
                    }).eq('id', item.id).select('id').single())
                    await load()
                    notify('Media details saved.')
                })),
                action('Remove', () => {
                    if (!confirm('Remove this attachment?')) return
                    perform(async () => {
                        check(await attachments().delete().eq('id', item.id).select('id').single())
                        const cleanup = item.path ? await bucket.remove([item.path]) : null
                        await load()
                        if (cleanup?.error) throw new Error('Attachment removed. Remove the unlinked file in Supabase Storage: ' + item.path)
                        notify('Attachment removed.')
                    })
                }, 'danger'))
            mediaList.append(row)
        }
    }

    function select(project, restoreFocus = true) {
        selected = project
        form.reset()
        root.querySelector('#showcasePreview').hidden = true
        upload.reset()
        embed.reset()
        fileFields.replaceChildren()
        form.elements.slug.readOnly = Boolean(project)
        for (const field of textFields) form.elements[field].value = project?.[field] ?? (field === 'status' ? 'Design' : '')
        for (const field of listFields) form.elements[field].value = (project?.[field] || []).join('\n')
        form.elements.featured.checked = Boolean(project?.featured)
        form.elements.display_order.value = project?.display_order ?? 0
        mediaPanel.hidden = !project
        root.querySelector('#showcaseEditorTitle').textContent = project ? 'Edit project' : 'New project'
        renderMedia()
        if (restoreFocus) form.elements.title.focus()
    }

    async function load() {
        const current = ++loadVersion
        const recordsList = check(await records().select('*, showcase_media(*)').order('display_order').order('created_at', { ascending: false }))
        if (current !== loadVersion) return
        document.getElementById('statProjects').textContent = recordsList.length
        list.replaceChildren()
        if (!recordsList.length) list.textContent = 'No showcase projects yet.'
        if (selected) {
            selected = recordsList.find(project => project.id === selected.id) || null
            if (selected) renderMedia()
            else select(null, false)
        }
        for (const project of recordsList) {
            const row = document.createElement('div')
            row.className = 'item-row'
            const title = document.createElement('strong')
            title.textContent = project.title
            const state = document.createElement('p')
            state.textContent = [project.published_at ? 'Published' : 'Draft', project.status, project.featured && 'Featured'].filter(Boolean).join(' / ')
            const info = document.createElement('div')
            info.append(title, state)
            const buttons = document.createElement('div')
            buttons.className = 'item-actions'
            buttons.append(action('Edit', () => select(project)),
                action(project.published_at ? 'Unpublish' : 'Publish', () => perform(async () => {
                    check(await records().update({ published_at: project.published_at ? null : new Date().toISOString() })
                        .eq('id', project.id).select('id').single())
                    await load()
                    notify(project.published_at ? 'Project unpublished.' : 'Project published.')
                })),
                action('Delete', () => {
                    if (!confirm('Delete this project and its media?')) return
                    perform(async () => {
                        const media = check(await attachments().select('path').eq('project_id', project.id))
                        check(await records().delete().eq('id', project.id).select('id').single())
                        const paths = media.map(item => item.path).filter(Boolean)
                        const cleanup = paths.length ? await bucket.remove(paths) : null
                        await load()
                        if (cleanup?.error) throw new Error('Project deleted. Remove unlinked files for ' + project.id + ' in Supabase Storage.')
                        notify('Project deleted.')
                    })
                }, 'danger'))
            row.append(info, buttons)
            list.append(row)
        }
    }

    form.addEventListener('submit', event => {
        event.preventDefault()
        perform(async () => {
            const values = Object.fromEntries(textFields.map(field => [field, form.elements[field].value.trim()]))
            if (values.github_url && !githubRepository(values.github_url)) throw new Error('Enter a GitHub repository URL.')
            if (values.live_url && !httpsLink(values.live_url)) throw new Error('Enter a valid HTTPS demo URL.')
            values.github_url ||= null
            values.live_url = httpsLink(values.live_url) || null
            for (const field of listFields) values[field] = form.elements[field].value.split('\n').map(line => line.trim()).filter(Boolean)
            values.featured = form.elements.featured.checked
            values.display_order = Number(form.elements.display_order.value)
            if (selected) delete values.slug
            const query = selected ? records().update(values).eq('id', selected.id) : records().insert(values)
            const project = check(await query.select('*, showcase_media(*)').single())
            select(project, false)
            await load()
            notify('Project saved.')
        })
    })

    root.querySelector('#showcasePreviewButton').addEventListener('click', () => perform(async () => {
        const preview = root.querySelector('#showcasePreview')
        preview.replaceChildren(element('h3', form.elements.title.value || 'Untitled project'))
        const labels = {
            summary: 'Summary', overview: 'Overview', problem: 'Problem', objectives: 'Objectives',
            technologies: 'Technologies', architecture: 'Architecture', features: 'Implemented features',
            proposed_features: 'Proposed features', challenges: 'Challenges', outcomes: 'Outcomes', lessons: 'Lessons learned'
        }
        for (const [name, label] of Object.entries(labels)) {
            const value = form.elements[name].value.trim()
            if (value) preview.append(element('h4', label), element('p', value))
        }
        const pictures = orderedMedia(selected?.showcase_media).filter(item => item.kind === 'image')
        if (pictures.length) {
            const { data } = await bucket.createSignedUrls(pictures.map(item => item.path), 900)
            for (const signed of data || []) {
                if (!signed.signedUrl) continue
                const image = element('img', '', 'editorial-photo')
                image.alt = pictures.find(item => item.path === signed.path).description
                image.src = signed.signedUrl
                preview.append(image)
            }
        }
        preview.hidden = false
    }))
    root.querySelector('#newShowcaseProject').addEventListener('click', () => select(null))

    filePicker.addEventListener('change', () => {
        fileFields.replaceChildren()
        for (const file of filePicker.files) {
            const label = document.createElement('label')
            label.textContent = 'Accessible description for ' + file.name
            const input = document.createElement('input')
            input.required = true
            input.maxLength = 300
            label.append(input)
            fileFields.append(label)
        }
    })

    upload.addEventListener('submit', event => {
        event.preventDefault()
        perform(async () => {
            const project = selected
            if (!project) return
            const descriptions = [...fileFields.querySelectorAll('input')].map(input => input.value.trim())
            const files = [...filePicker.files]
            if (!files.length || files.some((file, index) => !uploadTypes[file.type] || !descriptions[index] || file.size > 20 * 1024 * 1024)) {
                throw new Error('Each file needs a description and must use JPEG, PNG, WebP, MP4 or WebM and be 20 MiB or smaller.')
            }
            let order = Math.max(-1, ...orderedMedia(project.showcase_media).map(item => item.display_order))
            const failures = []
            for (const [index, file] of files.entries()) {
                const [kind, extension] = uploadTypes[file.type]
                const path = project.id + '/' + crypto.randomUUID() + '.' + extension
                try {
                    check(await bucket.upload(path, file, { contentType: file.type, upsert: false }))
                    const { error } = await attachments().insert({ project_id: project.id, kind, path, description: descriptions[index], display_order: ++order })
                    if (error) {
                        const cleanup = await bucket.remove([path])
                        if (cleanup.error) throw new Error('Unlinked file: ' + path)
                        throw new Error(error.message)
                    }
                } catch (error) {
                    failures.push(file.name + ': ' + error.message)
                }
            }
            upload.reset()
            fileFields.replaceChildren()
            await load()
            if (failures.length) throw new Error('Some files could not be attached. ' + failures.join(' | '))
            notify('Media uploaded.')
        })
    })

    embed.addEventListener('submit', event => {
        event.preventDefault()
        perform(async () => {
            if (!selected) return
            const youtubeId = youtubeVideoId(embed.elements.url.value.trim())
            if (!youtubeId) throw new Error('Enter a supported HTTPS YouTube video URL.')
            check(await attachments().insert({
                project_id: selected.id,
                kind: 'youtube',
                youtube_id: youtubeId,
                description: embed.elements.description.value.trim(),
                display_order: Math.max(-1, ...orderedMedia(selected.showcase_media).map(item => item.display_order)) + 1
            }))
            embed.reset()
            await load()
            notify('YouTube demo saved.')
        })
    })

    return () => load().catch(error => {
        list.textContent = 'Showcase unavailable. Apply supabase-showcase.sql and verify your admin access.'
        notify(error.message, 'error')
    })
}
