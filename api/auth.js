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

  const { action, data } = req.body

  try {
    switch(action) {
      case 'login': {
        const { email, password } = data

        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        })

        if (error) throw error

        let profile = null
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        if (!profileError) {
          profile = profileData
        }

        res.status(200).json({ 
          success: true, 
          user: {
            id: authData.user.id,
            email: authData.user.email
          },
          session: authData.session.access_token,
          profile 
        })
        break
      }

      case 'register': {
        const { email, password, name, country, age, bio, role } = data

        const { data: authData, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: name,
              country: country,
              age: age,
              bio: bio || null,
              role: role
            },
            emailRedirectTo: `${req.headers.origin}/verify.html`
          }
        })

        if (error) throw error

        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
          throw new Error('User already registered')
        }

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              name: name,
              email: email,
              country: country,
              age: age,
              bio: bio || null,
              role: role,
              created_at: new Date().toISOString()
            }])

          if (profileError) {
            console.error('Profile creation error:', profileError)
          }
        }

        res.status(200).json({ 
          success: true, 
          user: {
            id: authData.user?.id,
            email: authData.user?.email
          },
          message: 'Registration successful. Please check your email to confirm your account.'
        })
        break
      }

      case 'getUser': {
        const { session } = data

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

      case 'resetPassword': {
        const { email } = data

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${req.headers.origin}/reset-password.html`,
        })

        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      case 'verifyEmail': {
        const { token } = data

        const { data: authData, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })

        if (error) throw error
        res.status(200).json({ success: true, user: authData?.user })
        break
      }

      case 'resendVerification': {
        const { email } = data

        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email
        })

        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      case 'checkVerificationStatus': {
        const { email } = data

        const { data: { user }, error } = await supabase.auth.admin.getUserByEmail(email)

        if (error) throw error
        res.status(200).json({ success: true, isVerified: user?.email_confirmed_at ? true : false })
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