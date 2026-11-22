export const GALLERY_CATEGORIES = ['Graduation', 'At Work', 'Personal', 'Events']
export const GALLERY_BUCKET = 'about-gallery'
export const photoPath = id => id + '.webp'

export function photoDate(value) {
    if (!value) return ''
    const date = new Date(value + 'T00:00:00Z')
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'long', timeZone: 'UTC'
    }).format(date)
}
