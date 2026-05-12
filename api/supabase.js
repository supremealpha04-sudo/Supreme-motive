import { createClient } from '@supabase/supabase-js'

// These environment variables are NEVER exposed to the client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { action, data } = req.body

  try {
    switch(action) {
      case 'getQuotes': {
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        res.status(200).json({ data: quotes, success: true })
        break
      }

      case 'likeQuote': {
        const { data: like, error } = await supabase
          .from('quote_likes')
          .insert([data])
        if (error) throw error
        res.status(200).json({ data: like, success: true })
        break
      }

      case 'unlikeQuote': {
        const { error } = await supabase
          .from('quote_likes')
          .delete()
          .match(data)
        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      case 'saveQuote': {
        const { data: save, error } = await supabase
          .from('quote_saves')
          .insert([data])
        if (error) throw error
        res.status(200).json({ data: save, success: true })
        break
      }

      case 'unsaveQuote': {
        const { error } = await supabase
          .from('quote_saves')
          .delete()
          .match(data)
        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      case 'getLikeCount': {
        const { count, error } = await supabase
          .from('quote_likes')
          .select('*', { count: 'exact', head: true })
          .eq('quote_id', data.quoteId)
        if (error) throw error
        res.status(200).json({ count, success: true })
        break
      }

      case 'getUserLikes': {
        const { data: likes, error } = await supabase
          .from('quote_likes')
          .select('quote_id')
          .eq('user_id', data.userId)
        if (error) throw error
        res.status(200).json({ data: likes, success: true })
        break
      }

      case 'getUserSaves': {
        const { data: saves, error } = await supabase
          .from('quote_saves')
          .select('quote_id')
          .eq('user_id', data.userId)
        if (error) throw error
        res.status(200).json({ data: saves, success: true })
        break
      }

      case 'getNotifications': {
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', data.userId)
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) throw error
        res.status(200).json({ data: notifications, success: true })
        break
      }

      case 'markNotificationRead': {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', data.notificationId)
        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      case 'markAllNotificationsRead': {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', data.userId)
        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      default:
        res.status(400).json({ error: 'Invalid action', success: false })
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: error.message, success: false })
  }
}