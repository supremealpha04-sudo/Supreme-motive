import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false })
  }

  try {
    const { action, data } = req.body

    console.log('Received action:', action) // Debug log

    if (!action) {
      return res.status(400).json({ error: 'Action is required', success: false })
    }

    switch(action) {
      case 'getQuoteLikeCount': {
        const { quoteId } = data
        
        if (!quoteId) {
          return res.status(400).json({ error: 'Quote ID required', success: false })
        }
        
        const { count, error } = await supabase
          .from('quote_likes')
          .select('*', { count: 'exact', head: true })
          .eq('quote_id', quoteId)
          
        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ count: count || 0, success: true })
      }

      case 'getUserQuoteLikes': {
        const { userId } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { data: likes, error } = await supabase
          .from('quote_likes')
          .select('quote_id')
          .eq('user_id', userId)
          
        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ data: likes || [], success: true })
      }

      case 'getUserQuoteSaves': {
        const { userId } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { data: saves, error } = await supabase
          .from('quote_saves')
          .select('quote_id')
          .eq('user_id', userId)
          
        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ data: saves || [], success: true })
      }

      case 'likeQuote': {
        const { quoteId, userId } = data
        
        if (!quoteId || !userId) {
          return res.status(400).json({ error: 'Quote ID and User ID required', success: false })
        }
        
        const { error } = await supabase
          .from('quote_likes')
          .insert([{ quote_id: quoteId, user_id: userId }])
          
        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'unlikeQuote': {
        const { quoteId, userId } = data
        
        if (!quoteId || !userId) {
          return res.status(400).json({ error: 'Quote ID and User ID required', success: false })
        }
        
        const { error } = await supabase
          .from('quote_likes')
          .delete()
          .eq('quote_id', quoteId)
          .eq('user_id', userId)
          
        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'saveQuote': {
        const { quoteId, userId } = data
        
        if (!quoteId || !userId) {
          return res.status(400).json({ error: 'Quote ID and User ID required', success: false })
        }
        
        const { error } = await supabase
          .from('quote_saves')
          .insert([{ quote_id: quoteId, user_id: userId }])
          
        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'unsaveQuote': {
        const { quoteId, userId } = data
        
        if (!quoteId || !userId) {
          return res.status(400).json({ error: 'Quote ID and User ID required', success: false })
        }
        
        const { error } = await supabase
          .from('quote_saves')
          .delete()
          .eq('quote_id', quoteId)
          .eq('user_id', userId)
          
        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'getAllQuotes': {
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }

        return res.status(200).json({ success: true, data: quotes || [] })
      }

      case 'getProfile': {
        const { userId } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ data: profile, success: true })
      }

      case 'createProfile': {
        const { user_id, name, email, country, age, bio, role } = data
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .insert([{
            user_id,
            name: name || email?.split('@')[0],
            email,
            country: country || null,
            age: age || null,
            bio: bio || null,
            role: role || 'user',
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ data: profile, success: true })
      }

      case 'updateProfile': {
        const { userId, updates } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { error } = await supabase
          .from('profiles')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', userId)

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'getUserUnlocks': {
        const { userId } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { data: unlocks, error } = await supabase
          .from('unlocks')
          .select(`*, ebook:ebooks(*)`)
          .eq('user_id', userId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ data: unlocks || [], success: true })
      }

      case 'getUserSavedEbooks': {
        const { userId } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { data: saved, error } = await supabase
          .from('saved_ebooks')
          .select(`*, ebook:ebooks(*)`)
          .eq('user_id', userId)

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ data: saved || [], success: true })
      }

      case 'getUserPayments': {
        const { userId } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { data: payments, error } = await supabase
          .from('stars_payments')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ data: payments || [], success: true })
      }

      case 'getUserNotifications': {
        const { userId } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ data: notifications || [], success: true })
      }

      case 'markNotificationRead': {
        const { notificationId } = data
        
        if (!notificationId) {
          return res.status(400).json({ error: 'Notification ID required', success: false })
        }
        
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'markAllNotificationsRead': {
        const { userId } = data
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID required', success: false })
        }
        
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'getAllEbooks': {
        const { data: ebooks, error } = await supabase
          .from('ebooks')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }

        return res.status(200).json({ success: true, data: ebooks || [] })
      }

      case 'checkSavedEbook': {
        const { ebookId, userId } = data
        
        const { data: saved, error } = await supabase
          .from('saved_ebooks')
          .select('*')
          .eq('ebook_id', ebookId)
          .eq('user_id', userId)
          .maybeSingle()

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ exists: !!saved, success: true })
      }

      case 'saveEbook': {
        const { ebookId, userId } = data
        
        const { error } = await supabase
          .from('saved_ebooks')
          .insert([{ ebook_id: ebookId, user_id: userId }])

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'unsaveEbook': {
        const { ebookId, userId } = data
        
        const { error } = await supabase
          .from('saved_ebooks')
          .delete()
          .eq('ebook_id', ebookId)
          .eq('user_id', userId)

        if (error) {
          console.error('Database error:', error)
          return res.status(500).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}`, success: false })
    }
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error', success: false })
  }
}
