const SUPABASE_URL = 'https://pthcviwhcsluovdekjub.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_OE7PTaMrXu7GU4aDbztA_g_WhiKbjRC'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function getOrCreateVisitSessionId() {
    let sessionId = sessionStorage.getItem('portfolioVisitSessionId')
    if (!sessionId) {
        sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
        sessionStorage.setItem('portfolioVisitSessionId', sessionId)
    }
    return sessionId
}

function getDeviceDetails() {
    const userAgent = navigator.userAgent || ''
    const isIPad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    let deviceType = 'Desktop'
    if (isIPad || /Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) {
        deviceType = 'Tablet'
    } else if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) {
        deviceType = 'Phone'
    }

    let operatingSystem = 'Other'
    if (/Android/i.test(userAgent)) operatingSystem = 'Android'
    else if (/iPhone|iPad|iPod/i.test(userAgent) || isIPad) operatingSystem = 'iOS'
    else if (/Windows NT/i.test(userAgent)) operatingSystem = 'Windows'
    else if (/Mac OS X|Macintosh/i.test(userAgent)) operatingSystem = 'macOS'
    else if (/CrOS/i.test(userAgent)) operatingSystem = 'ChromeOS'
    else if (/Linux/i.test(userAgent)) operatingSystem = 'Linux'

    let browser = 'Other'
    if (/Edg\//i.test(userAgent)) browser = 'Edge'
    else if (/OPR\//i.test(userAgent)) browser = 'Opera'
    else if (/Firefox\//i.test(userAgent)) browser = 'Firefox'
    else if (/CriOS\//i.test(userAgent)) browser = 'Chrome'
    else if (/Chrome\//i.test(userAgent)) browser = 'Chrome'
    else if (/Safari\//i.test(userAgent)) browser = 'Safari'

    return { deviceType, operatingSystem, browser }
}

export async function trackDeviceVisit() {
    try {
        const sessionId = getOrCreateVisitSessionId()
        const pagePath = window.location.pathname || '/'
        const recordedPages = JSON.parse(sessionStorage.getItem('portfolioRecordedPages') || '[]')
        if (recordedPages.includes(pagePath)) return

        const { deviceType, operatingSystem, browser } = getDeviceDetails()
        const { error } = await supabase.from('device_visits').insert({
            session_id: sessionId,
            page_path: pagePath.slice(0, 500),
            device_type: deviceType,
            browser,
            operating_system: operatingSystem
        })

        if (error) throw error
        sessionStorage.setItem('portfolioRecordedPages', JSON.stringify([...recordedPages, pagePath]))
    } catch (error) {
        console.warn('Could not record anonymous device visit:', error)
    }
}

export async function getProjects() {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
    
    if (error) return []
    return data
}

export async function getCertificates(limit = 3) {
    let query = supabase
        .from('certificates')
        .select('*')
        .eq('is_active', true)
        .order('date_earned', { ascending: false })
    
    if (limit) query = query.limit(limit)
    
    const { data, error } = await query
    if (error) return []
    return data
}

export async function getSiteSettings() {
    const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
    
    if (error) return {}
    
    const settings = {}
    data.forEach(item => settings[item.setting_key] = item.setting_value)
    return settings
}

export async function trackVisitor() {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: existing } = await supabase
        .from('visitors')
        .select('visitor_count, id')
        .eq('visit_date', today)
        .single()
    
    if (existing) {
        await supabase
            .from('visitors')
            .update({ visitor_count: existing.visitor_count + 1 })
            .eq('id', existing.id)
    } else {
        await supabase
            .from('visitors')
            .insert([{ visit_date: today, visitor_count: 1 }])
    }
}

export async function getTotalVisitors() {
    const { data, error } = await supabase
        .from('visitors')
        .select('visitor_count')
    
    if (error) return 0
    return data.reduce((sum, day) => sum + day.visitor_count, 0)
}
