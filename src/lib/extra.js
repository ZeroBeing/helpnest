
import { supabase } from './supabaseClient'

// Requests where I offered help.
// Excludes requests that have been deleted.
export async function listMyOffers() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('You must be logged in')
  }

  const { data, error } = await supabase
    .from('responses')
    .select(`
      id,
      accepted,
      request_id,
      requests!inner(
        id,
        title,
        status,
        category,
        deleted_at
      )
    `)
    .eq('helper_id', userData.user.id)
    .is('requests.deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data
}
