(async () => {
    const download = document.querySelector('[data-cv-download]')
    const request = document.querySelector('[data-cv-request]')
    // Switch on only when this exact file has been reviewed and approved for publication.
    const cvApproved = false
    const path = 'assets/documents/Felix_Daka_CV.pdf'
    if (!cvApproved || !download || !request) return
    try {
        const response = await fetch(path, { method: 'HEAD' })
        if (response.ok && /^application\/pdf\b/i.test(response.headers.get('content-type') || '')) {
            download.href = path
            download.hidden = false
            request.hidden = true
        }
    } catch {
        // The email request remains available when a PDF cannot be reached.
    }
})()
