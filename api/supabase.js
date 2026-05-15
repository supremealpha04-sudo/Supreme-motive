import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check if environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
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

    // Log for debugging (check Vercel logs)
    console.log('Action received:', action)
    console.log('Supabase URL configured:', !!supabaseUrl)

    if (!action) {
      return res.status(400).json({ error: 'Action is required', success: false })
    }

    // Handle different actions
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
          
        if (error) throw error
        
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
          
        if (error) throw error
        
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
          
        if (error) throw error
        
        return res.status(200).json({ data: saves || [], success: true })
      }

      case 'likeQuote': {
        const { quoteId, userId } = data
        
        const { error } = await supabase
          .from('quote_likes')
          .insert([{ quote_id: quoteId, user_id: userId }])
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'unlikeQuote': {
        const { quoteId, userId } = data
        
        const { error } = await supabase
          .from('quote_likes')
          .delete()
          .eq('quote_id', quoteId)
          .eq('user_id', userId)
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'saveQuote': {
        const { quoteId, userId } = data
        
        const { error } = await supabase
          .from('quote_saves')
          .insert([{ quote_id: quoteId, user_id: userId }])
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'unsaveQuote': {
        const { quoteId, userId } = data
        
        const { error } = await supabase
          .from('quote_saves')
          .delete()
          .eq('quote_id', quoteId)
          .eq('user_id', userId)
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'getAllQuotes': {
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        return res.status(200).json({ success: true, data: quotes || [] })
      }

      // Add more cases as needed...

      default:
        return res.status(400).json({ error: `Unknown action: ${action}`, success: false })
    }
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: error.message || 'Internal server error', 
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
