import { createClient } from '@supabase/supabase-js'

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

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { name, email, subject, message, userId } = req.body

  // Validate required fields
  if (!name || !email || !subject || !message) {
    res.status(400).json({ 
      error: 'Missing required fields', 
      success: false,
      required: ['name', 'email', 'subject', 'message']
    })
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email address', success: false })
    return
  }

  // Validate message length
  if (message.length < 10) {
    res.status(400).json({ error: 'Message must be at least 10 characters', success: false })
    return
  }

  if (message.length > 5000) {
    res.status(400).json({ error: 'Message cannot exceed 5000 characters', success: false })
    return
  }

  try {
    // Save contact message to database
    const { data: contact, error: insertError } = await supabase
      .from('contacts')
      .insert([{
        name: name,
        email: email,
        subject: subject,
        message: message,
        user_id: userId || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (insertError) throw insertError

    // Optional: Send email notification to admin
    // You can integrate with a email service like SendGrid, Resend, etc.
    // For now, we'll just log it
    console.log(`New contact message from ${name} (${email}): ${subject}`)

    // Create notification for admin
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: null, // System notification
        title: 'New Contact Message',
        message: `${name} sent a new message: ${subject.substring(0, 50)}...`,
        type: 'contact',
        content_id: contact.id,
        is_read: false,
        created_at: new Date().toISOString()
      }])

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
    }

    res.status(200).json({ 
      success: true, 
      message: 'Your message has been sent successfully! We will respond within 24-48 hours.',
      data: {
        id: contact.id,
        created_at: contact.created_at
      }
    })

  } catch (error) {
    console.error('Contact form error:', error)
    
    // Handle duplicate or specific errors
    if (error.code === '23505') {
      res.status(400).json({ error: 'Duplicate submission. Please wait a few minutes.', success: false })
    } else {
      res.status(500).json({ error: 'Failed to send message. Please try again later.', success: false })
    }
  }
}
