import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --------------------------------------------------
// AI Moderation & Profanity Guard
// --------------------------------------------------
const BANNED_KEYWORDS = [
  'scam', 'send money', 'wire transfer', 'crypto', 'bitcoin',
  'gift card', 'otp', 'password', 'bank account',
  'abuse', 'profanity', 'hate', 'harass' // expand as needed
]

export function checkContentSafety(text) {
  if (!text) return { safe: true }
  const lower = text.toLowerCase()
  const found = BANNED_KEYWORDS.find(word => lower.includes(word))
  if (found) {
    return { safe: false, reason: `Content contains forbidden terms ("${found}")` }
  }
  return { safe: true }
}

// Helper wrapper for Supabase responses
function check({ data, error }) {
  if (error) throw error
  return data
}

// --------------------------------------------------
// 1. User & Profile Management
// --------------------------------------------------
export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profile = check(
    await supabase.from('users').select('*').eq('id', user.id).single()
  )

  // Check account restriction status
  if (profile && (profile.status === 'banned' || profile.status === 'suspended')) {
    throw new Error(`Account is ${profile.status}. Access restricted.`)
  }

  return profile
}

export async function getProfileStats(userId) {
  // Fetch overall rating and total review count
  const profile = check(
    await supabase.from('users').select('name, rating').eq('id', userId).single()
  )
  const ratings = check(
    await supabase.from('ratings').select('id, rating, review').eq('rated_id', userId)
  )

  return {
    ...profile,
    total_reviews: ratings ? ratings.length : 0,
    reviews: ratings || []
  }
}

// --------------------------------------------------
// 2. Help Requests (Hides completed 'done' requests)
// --------------------------------------------------
export async function listOpenRequests(category = null) {
  let q = supabase
    .from('requests')
    .select('*, users(name, rating)')
    .eq('status', 'open') // Hides 'done' and 'matched' requests from public feed
    .eq('scam_flag', false)
    .order('created_at', { ascending: false })

  if (category) q = q.eq('category', category)
  return check(await q)
}

export async function createRequest({ title, description, category, area = 'Multan' }) {
  // AI Moderation check
  const titleCheck = checkContentSafety(title)
  const descCheck = checkContentSafety(description)

  if (!titleCheck.safe) throw new Error(titleCheck.reason)
  if (!descCheck.safe) throw new Error(descCheck.reason)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in')

  return check(
    await supabase.from('requests').insert([{
      user_id: user.id,
      title,
      description,
      category,
      area
    }]).select().single()
  )
}

// --------------------------------------------------
// 3. Real-Time Chat with Moderation
// --------------------------------------------------
export async function sendMessage(requestId, text) {
  const modCheck = checkContentSafety(text)
  if (!modCheck.safe) {
    throw new Error(`Message blocked: ${modCheck.reason}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in')

  return check(
    await supabase.from('messages').insert([{
      request_id: requestId,
      sender_id: user.id,
      content: text
    }]).select().single()
  )
}

// --------------------------------------------------
// 4. Persistent Notifications
// --------------------------------------------------
export async function getNotifications() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  return check(
    await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
  )
}

export async function markNotificationAsRead(notificationId) {
  return check(
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  )
}
