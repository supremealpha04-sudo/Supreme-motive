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

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { email, userId } = req.body

  if (!email) {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email address' })
    return
  }

  try {
    // Check if already subscribed
    const { data: existing, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      res.status(200).json({ 
        success: true, 
        message: 'You are already subscribed to our newsletter!' 
      })
      return
    }

    // Add to newsletter subscribers
    const { data: subscriber, error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        email: email,
        user_id: userId || null,
        status: 'active',
        subscribed_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (insertError) throw insertError

    res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter!',
      data: subscriber
    })

  } catch (error) {
    console.error('Newsletter subscription error:', error)
    
    if (error.code === '23505') {
      res.status(400).json({ error: 'You are already subscribed to our newsletter!' })
    } else {
      res.status(500).json({ error: 'Failed to subscribe. Please try again later.' })
    }
  }
}
