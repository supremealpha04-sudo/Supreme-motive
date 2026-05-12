import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
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

  const { action, session } = req.body

  try {
    switch(action) {
      case 'getUser': {
        if (!session) {
          res.status(200).json({ user: null, success: true })
          return
        }
        
        const { data: { user }, error } = await supabase.auth.getUser(session)
        if (error) throw error
        res.status(200).json({ user, success: true })
        break
      }

      case 'signOut': {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      default:
        res.status(400).json({ error: 'Invalid action', success: false })
    }
  } catch (error) {
    console.error('Auth Error:', error)
    res.status(500).json({ error: error.message, success: false })
  }
}