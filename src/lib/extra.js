import { supabase } from './supabaseClient'

// Requests where I offered help (so a helper can find them again)
export async function listMyOffers() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('You must be logged in')

  const { data, error } = await supabase
    .from('responses')
    .select('id, accepted, request_id, requests(id, title, status, category)')
    .eq('helper_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}