// src/lib/api.js
// Owner: Ahmed. Login + saving/loading data. Hamza's screens call these functions.
// Every function returns the data, or throws an Error with a readable message.
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

// The name is saved in user metadata; a database trigger copies it into the users table.
export async function signUp(email, password, name) {
  return check(
    await supabase.auth.signUp({ email, password, options: { data: { name } } })
  )
}

export async function logIn(email, password) {
  return check(await supabase.auth.signInWithPassword({ email, password }))
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
    await supabase.from('users').select('id, name, phone_verified, rating').eq('id', userId).single()
  )
}

// ---------- REQUESTS ----------

// category and scamFlag come from Hamza's AI check (pass them in after the AI runs).
export async function createRequest({ title, description, category = 'Other', scamFlag = false }) {
  const user_id = await currentUserId()
  return check(
    await supabase
      .from('requests')
      .insert({ user_id, title, description, category, scam_flag: scamFlag })
      .select()
      .single()
  )
}

// Home screen list. Hides flagged scams. Optional category filter.
export async function listOpenRequests(category = null) {
  let q = supabase
    .from('requests')
    .select('id, user_id, title, description, category, status, scam_flag, created_at, users(name, rating)')
    .eq('status', 'open')
    .eq('scam_flag', false)
    .order('created_at', { ascending: false })
  if (category) q = q.eq('category', category)
  return check(await q)
}

export async function getRequest(requestId) {
  return check(
    await supabase
      .from('requests')
      .select('*, users(name, rating)')
      .eq('id', requestId)
      .single()
  )
}

// Requests posted by the logged-in user (for the profile screen).
export async function listMyRequests() {
  const user_id = await currentUserId()
  return check(
    await supabase.from('requests').select('*').eq('user_id', user_id).order('created_at', { ascending: false })
  )
}

// Only the request owner can do this (enforced by the database).
export async function setRequestStatus(requestId, status) {
  return check(
    await supabase.from('requests').update({ status }).eq('id', requestId).select().single()
  )
}

// ---------- RESPONSES (offering help) ----------

export async function offerHelp(requestId) {
  const helper_id = await currentUserId()
  return check(
    await supabase.from('responses').insert({ request_id: requestId, helper_id }).select().single()
  )
}

// Visible to the request owner and the helper themselves.
export async function listResponses(requestId) {
  return check(
    await supabase
      .from('responses')
      .select('id, request_id, helper_id, created_at, users(name, rating)')
      .eq('request_id', requestId)
  )
}

// ---------- MESSAGES (chat) ----------
// Only the request owner and helpers who offered help can read/write.

export async function sendMessage(requestId, text) {
  const sender_id = await currentUserId()
  return check(
    await supabase.from('messages').insert({ request_id: requestId, sender_id, text }).select().single()
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

// Live chat. Call it once when the chat opens; it returns a function to stop listening.
// Example: const stop = subscribeToMessages(id, (msg) => setMessages((m) => [...m, msg]))
// Call stop() when the screen closes.
export function subscribeToMessages(requestId, onNewMessage) {
  const channel = supabase
    .channel(`messages-${requestId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ---------- RATINGS ----------
// A database trigger updates users.rating as the average automatically.

export async function submitRating(requestId, ratedUserId, stars) {
  const rater_id = await currentUserId()
  return check(
    await supabase
      .from('ratings')
      .insert({ request_id: requestId, rater_id, rated_id: ratedUserId, stars })
      .select()
      .single()
  )
}

// ---------- REPORTS ----------

export async function reportRequest(requestId, reason) {
  const reporter_id = await currentUserId()
  const { error } = await supabase.from('reports').insert({ request_id: requestId, reporter_id, reason })
  if (error) throw new Error(error.message)
}
