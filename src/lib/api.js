/**
 * Safe Soft-Delete for Request Owners.
 * Sets `deleted_at` so history, offers, chats, and ratings remain intact 
 * without breaking foreign key relationships or deleting unrelated data.
 */
export async function deleteRequest(requestId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Backend verification: Ensure logged-in user owns this request
  const { data: req, error: fetchErr } = await supabase
    .from('requests')
    .select('user_id')
    .eq('id', requestId)
    .single();

  if (fetchErr || !req) throw new Error('Request not found');
  if (req.user_id !== user.id) {
    throw new Error('Unauthorized: You can only delete your own request.');
  }

  // Soft-delete: Hide request while preserving DB relations
  const { error } = await supabase
    .from('requests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw error;
  return true;
}
