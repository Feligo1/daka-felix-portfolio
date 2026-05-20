const SUPABASE_URL = 'https://pthcviwhcsluovdekjub.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_OE7PTaMrXu7GU4aDbztA_g_WhiKbjRC'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
