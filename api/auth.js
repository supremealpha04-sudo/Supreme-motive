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
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false })
  }

  try {
    const { action, data } = req.body

    // Validate action
    if (!action) {
      return res.status(400).json({ error: 'Action is required', success: false })
    }

    switch(action) {
      case 'login': {
        const { email, password } = data
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required', success: false })
        }

        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        })

        if (error) {
          return res.status(401).json({ error: error.message, success: false })
        }

        let profile = null
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (!profileError) {
          profile = profileData
        }

        return res.status(200).json({ 
          success: true, 
          user: {
            id: authData.user.id,
            email: authData.user.email
          },
          session: authData.session.access_token,
          profile 
        })
      }

      case 'register': {
        const { email, password, name, country, age, bio, role } = data

        if (!email || !password || !name) {
          return res.status(400).json({ error: 'Email, password, and name are required', success: false })
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: name,
              country: country || null,
              age: age || null,
              bio: bio || null,
              role: role || 'user'
            },
            emailRedirectTo: `${process.env.SITE_URL || req.headers.origin}/verify.html`
          }
        })

        if (error) {
          return res.status(400).json({ error: error.message, success: false })
        }

        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
          return res.status(400).json({ error: 'User already registered', success: false })
        }

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              name: name,
              email: email,
              country: country || null,
              age: age || null,
              bio: bio || null,
              role: role || 'user',
              created_at: new Date().toISOString()
            }])

          if (profileError) {
            console.error('Profile creation error:', profileError)
          }
        }

        return res.status(200).json({ 
          success: true, 
          user: {
            id: authData.user?.id,
            email: authData.user?.email
          },
          message: 'Registration successful. Please check your email to confirm your account.'
        })
      }

      case 'getUser': {
        const { session } = data

        if (!session) {
          return res.status(200).json({ user: null, success: true })
        }
        
        const { data: { user }, error } = await supabase.auth.getUser(session)
        
        if (error) {
          return res.status(401).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ user, success: true })
      }

      case 'signOut': {
        const { error } = await supabase.auth.signOut()
        if (error) {
          return res.status(400).json({ error: error.message, success: false })
        }
        return res.status(200).json({ success: true })
      }

      case 'resetPassword': {
        const { email } = data

        if (!email) {
          return res.status(400).json({ error: 'Email is required', success: false })
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.SITE_URL || req.headers.origin}/reset-password.html`,
        })

        if (error) {
          return res.status(400).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      case 'verifyEmail': {
        const { token } = data

        if (!token) {
          return res.status(400).json({ error: 'Token is required', success: false })
        }

        const { data: authData, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })

        if (error) {
          return res.status(400).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true, user: authData?.user })
      }

      case 'resendVerification': {
        const { email } = data

        if (!email) {
          return res.status(400).json({ error: 'Email is required', success: false })
        }

        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email
        })

        if (error) {
          return res.status(400).json({ error: error.message, success: false })
        }
        
        return res.status(200).json({ success: true })
      }

      default:
        return res.status(400).json({ error: 'Invalid action', success: false })
    }
  } catch (error) {
    console.error('Auth Error:', error)
    return res.status(500).json({ error: 'Internal server error: ' + error.message, success: false })
  }
}
