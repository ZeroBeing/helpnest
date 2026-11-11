
// src/lib/api.js
// Owner: Ahmed. Login + saving/loading data. Hamza's screens call these functions.
// Every function returns the data, or throws an Error with a readable message.

import { checkContentAI } from './scamCheck'
import { supabase } from './supabaseClient'

function check({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('You must be logged in')
  return data.user.id
}

// ---------- AUTH ----------

export function phoneToEmail(phone) {
  let digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '92' + digits.slice(1)
  if (digits.length < 8) throw new Error('Please enter a valid phone number')
  return `${digits}@neighbourly.app`
}

export async function signUp(email, password, name) {
  return check(
    await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
  )
}

export async function logIn(email, password) {
  return check(await supabase.auth.signInWithPassword({ email, password }))
}

export async function signUpWithPhone(phone, password, name) {
  return signUp(phoneToEmail(phone), password, name)
}

export async function logInWithPhone(phone, password) {
  return logIn(phoneToEmail(phone), password)
}

export async function logOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// ---------- USERS / PROFILE ----------

export async function getProfile(userId) {
  return check(
    await supabase
      .from('users')
      .select('id, name, phone_verified, rating')
      .eq('id', userId)
      .single()
  )
}

export async function getProfileStats(userId) {
  const profile = await getProfile(userId)

  const helped = await supabase
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .eq('rated_id', userId)

  if (helped.error) throw new Error(helped.error.message)

  const posted = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)

  if (posted.error) throw new Error(posted.error.message)

  return {
    name: profile.name,
    rating: Number(profile.rating),
    peopleHelped: helped.count ?? 0,
    requestsPosted: posted.count ?? 0,
  }
}

// ---------- REQUESTS ----------

export async function createRequest({
  title,
  description,
  category = 'Other',
  scamFlag = false,
  location,
  area,
  latitude,
  longitude,
  urgent,
}) {
  const user_id = await currentUserId()

  const row = {
    user_id,
    title,
    description,
    category,
    scam_flag: scamFlag,
  }

  // Save the readable approximate location.
  // "area" is accepted temporarily for compatibility with older screens.
  const savedLocation = location ?? area

  if (savedLocation !== undefined) {
    row.location = savedLocation
  }

  // Save GPS coordinates when available.
  row.latitude = latitude ?? null
  row.longitude = longitude ?? null

  if (urgent !== undefined) row.urgent = urgent

  return check(
    await supabase.from('requests').insert(row).select().single()
  )
}



export async function listOpenRequests(category = null, urgentOnly = false) {
  let q = supabase
    .from('requests')
    .select('*, users(name, rating)')
    .eq('status', 'open')
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (category) {
    q = q.eq('category', category)
  }

  if (urgentOnly) {
    q = q.eq('urgent', true)
  }

  return check(await q)
}



export async function getRequest(requestId) {
  return check(
    await supabase
      .from('requests')
      .select('*, users(name, rating)')
      .eq('id', requestId)
      .is('deleted_at', null)
      .single()
  )
}

export async function listMyRequests() {
  const user_id = await currentUserId()

  return check(
    await supabase
      .from('requests')
      .select('*')
      .eq('user_id', user_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  )
}

export async function setRequestStatus(requestId, status) {
  return check(
    await supabase
      .from('requests')
      .update({ status })
      .eq('id', requestId)
      .is('deleted_at', null)
      .select()
      .single()
  )
}

// SOFT DELETE: preserves the request and its related records.

export async function deleteRequest(requestId) {
  const user_id = await currentUserId()

  const { data, error } = await supabase
    .from('requests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('user_id', user_id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ---------- RESPONSES ----------

export async function offerHelp(requestId) {
  const helper_id = await currentUserId()

  return check(
    await supabase
      .from('responses')
      .insert({ request_id: requestId, helper_id })
      .select()
      .single()
  )
}

export async function listResponses(requestId) {
  return check(
    await supabase
      .from('responses')
      .select('id, request_id, helper_id, created_at, users(name, rating)')
      .eq('request_id', requestId)
  )
}

export async function getMyRole(requestId) {
  const userId = await currentUserId()

  const reqData = await supabase
    .from('requests')
    .select('user_id')
    .eq('id', requestId)
    .is('deleted_at', null)
    .single()

  const req = check(reqData)

  if (req.user_id === userId) return 'owner'

  const mineData = await supabase
    .from('responses')
    .select('id')
    .eq('request_id', requestId)
    .eq('helper_id', userId)
    .maybeSingle()

  const mine = check(mineData)

  return mine ? 'helper' : 'none'
}

// ---------- ACCEPTING A HELPER ----------

export async function acceptHelper(requestId, helperId) {
  const reset = await supabase
    .from('responses')
    .update({ accepted: false })
    .eq('request_id', requestId)

  if (reset.error) throw new Error(reset.error.message)

  const pick = await supabase
    .from('responses')
    .update({ accepted: true })
    .eq('request_id', requestId)
    .eq('helper_id', helperId)

  if (pick.error) throw new Error(pick.error.message)

  return setRequestStatus(requestId, 'matched')
}

export async function getAcceptedHelper(requestId) {
  const { data, error } = await supabase
    .from('responses')
    .select('helper_id, users(name, rating)')
    .eq('request_id', requestId)
    .eq('accepted', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

// ---------- MESSAGES / CHAT ----------

export async function sendMessage(requestId, text) {
  const sender_id = await currentUserId()
  const messageText = String(text || '').trim()

  if (!messageText) {
    throw new Error('Message cannot be empty')
  }

  const moderation = await checkContentAI(messageText)

  if (moderation.decision === 'BLOCK') {
    throw new Error(
      moderation.reason || 'This message violates HelpNest safety rules.'
    )
  }

  if (moderation.decision === 'WARN') {
    throw new Error(
      moderation.reason || 'This message needs review and cannot be sent.'
    )
  }

  return check(
    await supabase
      .from('messages')
      .insert({
        request_id: requestId,
        sender_id,
        text: messageText,
      })
      .select()
      .single()
  )
}

export async function loadMessages(requestId) {
  return check(
    await supabase
      .from('messages')
      .select('id, request_id, sender_id, text, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
  )
}

export function subscribeToMessages(requestId, onNewMessage) {
  const channel = supabase
    .channel(`messages-${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

// ---------- RATINGS ----------

export async function submitRating(
  requestId,
  ratedUserId,
  stars,
  review = ''
) {
  const rater_id = await currentUserId()

  return check(
    await supabase
      .from('ratings')
      .insert({
        request_id: requestId,
        rater_id,
        rated_id: ratedUserId,
        stars,
        review,
      })
      .select()
      .single()
  )
}

export async function completeRequest(
  requestId,
  helperId,
  stars,
  review = ''
) {
  await setRequestStatus(requestId, 'done')
  return submitRating(requestId, helperId, stars, review)
}

// ---------- REPORTS ----------

export async function reportRequest(requestId, reason) {
  const reporter_id = await currentUserId()

  const { error } = await supabase
    .from('reports')
    .insert({ request_id: requestId, reporter_id, reason })

  if (error) throw new Error(error.message)
}
