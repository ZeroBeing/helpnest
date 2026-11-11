import { supabase } from './supabaseClient';

/**
 * Checks whether a user is currently banned before granting write permissions.
 */
async function checkUserBanStatus(userId) {
  if (!userId) return;
  const { data: userData, error } = await supabase
    .from('users')
    .select('is_banned, banned_until, ban_reason')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking ban status:', error);
    return;
  }

  if (userData?.is_banned) {
    const isTempBan = userData.banned_until && new Date(userData.banned_until) > new Date();
    const isPermanent = !userData.banned_until;
    if (isTempBan || isPermanent) {
      const reason = userData.ban_reason ? ` Reason: ${userData.ban_reason}` : '';
      throw new Error(`Your account has been suspended.${reason}`);
    }
  }
}

/**
 * Moderate content via /api/moderate serverless endpoint.
 */
async function moderateContent(content, type = 'request') {
  try {
    const res = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, type })
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.flagged) {
      throw new Error(`Content blocked by moderation: ${data.reason || 'Inappropriate content detected.'}`);
    }
  } catch (err) {
    if (err.message.startsWith('Content blocked')) {
      throw err;
    }
    console.warn('Moderation check skipped due to error:', err);
  }
}

// -------------------------------------------------------------
// REQUESTS BACKEND API
// -------------------------------------------------------------

export async function getRequests() {
  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      users:user_id (full_name, phone)
    `)
    .eq('status', 'open')
    .is('deleted_at', null)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getRequestById(id) {
  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      users:user_id (full_name, phone)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createRequest(requestData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  await checkUserBanStatus(user.id);

  const textToModerate = `${requestData.title || ''} ${requestData.description || ''}`;
  await moderateContent(textToModerate, 'request');

  const payload = {
    user_id: user.id,
    title: requestData.title,
    description: requestData.description,
    category: requestData.category,
    urgency: requestData.urgency || 'medium',
    location: requestData.location,
    latitude: requestData.latitude || null,
    longitude: requestData.longitude || null,
    status: 'open'
  };

  const { data, error } = await supabase
    .from('requests')
    .insert([payload])
    .select();

  if (error) throw error;
  return data[0];
}

export async function deleteRequest(requestId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: req, error: fetchErr } = await supabase
    .from('requests')
    .select('user_id')
    .eq('id', requestId)
    .single();

  if (fetchErr || !req) throw new Error('Request not found');
  if (req.user_id !== user.id) throw new Error('Unauthorized: You can only delete your own request.');

  const { error } = await supabase
    .from('requests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw error;
  return true;
}

export async function updateRequestStatus(requestId, status) {
  const { data, error } = await supabase
    .from('requests')
    .update({ status })
    .eq('id', requestId)
    .select();

  if (error) throw error;
  return data[0];
}

// -------------------------------------------------------------
// OFFERS & MESSAGES BACKEND API
// -------------------------------------------------------------

export async function createOffer(requestId, message = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  await checkUserBanStatus(user.id);

  if (message.trim()) {
    await moderateContent(message, 'chat');
  }

  const { data, error } = await supabase
    .from('offers')
    .insert([{
      request_id: requestId,
      helper_id: user.id,
      message,
      status: 'pending'
    }])
    .select();

  if (error) throw error;
  return data[0];
}

export async function sendMessage(requestId, messageText) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  await checkUserBanStatus(user.id);
  await moderateContent(messageText, 'chat');

  const { data, error } = await supabase
    .from('messages')
    .insert([{
      request_id: requestId,
      sender_id: user.id,
      content: messageText
    }])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getMessages(requestId) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      users:sender_id (full_name)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// -------------------------------------------------------------
// REPORTS & ADMIN REVIEW BACKEND API
// -------------------------------------------------------------

export async function reportRequest(requestId, reason) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error: reportErr } = await supabase
    .from('reports')
    .insert([{
      request_id: requestId,
      reporter_id: user.id,
      reason
    }]);

  if (reportErr) throw reportErr;

  const { error: hideErr } = await supabase
    .from('requests')
    .update({ is_hidden: true })
    .eq('id', requestId);

  if (hideErr) throw hideErr;
  return true;
}

export async function adminReviewReport(requestId, action, banUser = false, banReason = '') {
  if (action === 'approve') {
    await supabase.from('requests').update({ is_hidden: false }).eq('id', requestId);
  } else if (action === 'dismiss') {
    await supabase.from('requests').update({ deleted_at: new Date().toISOString() }).eq('id', requestId);
  }

  if (banUser) {
    const { data: req } = await supabase
      .from('requests')
      .select('user_id')
      .eq('id', requestId)
      .single();

    if (req?.user_id) {
      await supabase
        .from('users')
        .update({
          is_banned: true,
          ban_reason: banReason || 'Violated community guidelines',
          banned_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', req.user_id);
    }
  }
  return true;
}
