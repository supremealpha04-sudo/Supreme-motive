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

  const { action, data } = req.body

  try {
    switch(action) {
      // ============================================
      // QUOTE MANAGEMENT
      // ============================================
      case 'getAllQuotes': {
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        const quotesWithStats = await Promise.all((quotes || []).map(async (quote) => {
          const { count: likes } = await supabase
            .from('quote_likes')
            .select('*', { count: 'exact', head: true })
            .eq('quote_id', quote.id)

          const { count: saves } = await supabase
            .from('quote_saves')
            .select('*', { count: 'exact', head: true })
            .eq('quote_id', quote.id)

          return {
            ...quote,
            likes_count: likes || 0,
            saves_count: saves || 0
          }
        }))

        res.status(200).json({ success: true, data: quotesWithStats })
        break
      }

      case 'createQuote': {
        const { text, author, tag, category, createdBy } = data

        const { data: quote, error } = await supabase
          .from('quotes')
          .insert([{
            text,
            author,
            tag,
            category,
            created_by: createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: quote })
        break
      }

      case 'updateQuote': {
        const { quoteId, text, author, tag, category } = data

        const { data: quote, error } = await supabase
          .from('quotes')
          .update({
            text,
            author,
            tag,
            category,
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId)
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: quote })
        break
      }

      case 'deleteQuote': {
        const { quoteId } = data

        await supabase.from('quote_likes').delete().eq('quote_id', quoteId)
        await supabase.from('quote_saves').delete().eq('quote_id', quoteId)
        
        const { error } = await supabase
          .from('quotes')
          .delete()
          .eq('id', quoteId)

        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      // ============================================
      // POST MANAGEMENT
      // ============================================
      case 'getAllPosts': {
        const { data: posts, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:created_by (name)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        const postsWithStats = await Promise.all((posts || []).map(async (post) => {
          const { count: likes } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)

          const { count: comments } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)

          return {
            ...post,
            likes_count: likes || 0,
            comments_count: comments || 0,
            author_name: post.profiles?.name || 'Admin'
          }
        }))

        res.status(200).json({ success: true, data: postsWithStats })
        break
      }

      case 'createPost': {
        const { title, content, imageUrl, createdBy } = data

        const { data: post, error } = await supabase
          .from('posts')
          .insert([{
            title,
            content,
            image_url: imageUrl || null,
            created_by: createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: post })
        break
      }

      case 'updatePost': {
        const { postId, title, content, imageUrl } = data

        const updates = {
          title,
          content,
          updated_at: new Date().toISOString()
        }
        if (imageUrl !== undefined) updates.image_url = imageUrl

        const { data: post, error } = await supabase
          .from('posts')
          .update(updates)
          .eq('id', postId)
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: post })
        break
      }

      case 'deletePost': {
        const { postId } = data

        await supabase.from('post_likes').delete().eq('post_id', postId)
        await supabase.from('comments').delete().eq('post_id', postId)
        
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId)

        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      // ============================================
      // VIDEO MANAGEMENT
      // ============================================
      case 'getAllVideos': {
        const { data: videos, error } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        const videosWithStats = await Promise.all((videos || []).map(async (video) => {
          const { count: likesCount } = await supabase
            .from('video_likes')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', video.id)

          const { count: viewsCount } = await supabase
            .from('video_views')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', video.id)

          const { count: commentsCount } = await supabase
            .from('video_comments')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', video.id)

          return {
            ...video,
            likes_count: likesCount || 0,
            views_count: viewsCount || 0,
            comments_count: commentsCount || 0
          }
        }))

        res.status(200).json({ success: true, data: videosWithStats })
        break
      }

      case 'createVideo': {
        const { title, description, videoUrl, thumbnailUrl, category, createdBy } = data

        const { data: video, error } = await supabase
          .from('videos')
          .insert([{
            title,
            description: description || null,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl || null,
            category: category || 'motivation',
            created_by: createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: video })
        break
      }

      case 'updateVideo': {
        const { videoId, title, description, category, videoUrl, thumbnailUrl } = data

        const updates = {
          title,
          description: description || null,
          category: category || 'motivation',
          updated_at: new Date().toISOString()
        }
        if (videoUrl) updates.video_url = videoUrl
        if (thumbnailUrl) updates.thumbnail_url = thumbnailUrl

        const { data: video, error } = await supabase
          .from('videos')
          .update(updates)
          .eq('id', videoId)
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: video })
        break
      }

      case 'deleteVideo': {
        const { videoId } = data

        await supabase.from('video_likes').delete().eq('video_id', videoId)
        await supabase.from('video_views').delete().eq('video_id', videoId)
        await supabase.from('video_comments').delete().eq('video_id', videoId)
        
        const { error } = await supabase
          .from('videos')
          .delete()
          .eq('id', videoId)

        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      // ============================================
      // EBOOK MANAGEMENT
      // ============================================
      case 'getAllEbooks': {
        const { data: ebooks, error } = await supabase
          .from('ebooks')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        const ebooksWithStats = await Promise.all((ebooks || []).map(async (ebook) => {
          const { count: pending } = await supabase
            .from('unlocks')
            .select('*', { count: 'exact', head: true })
            .eq('ebook_id', ebook.id)
            .eq('status', 'pending')

          const { count: approved } = await supabase
            .from('unlocks')
            .select('*', { count: 'exact', head: true })
            .eq('ebook_id', ebook.id)
            .eq('status', 'approved')

          return {
            ...ebook,
            pending_unlocks: pending || 0,
            approved_unlocks: approved || 0
          }
        }))

        res.status(200).json({ success: true, data: ebooksWithStats })
        break
      }

      case 'createEbook': {
        const { title, description, stars_price, is_paid, price, currency, cover_url, pdf_url, created_by } = data

        const { data: ebook, error } = await supabase
          .from('ebooks')
          .insert([{
            title,
            description,
            stars_price: stars_price || 0,
            is_paid: is_paid || false,
            price: price || 0,
            currency: currency || 'Stars',
            cover_url,
            pdf_url,
            created_by,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: ebook })
        break
      }

      case 'updateEbook': {
        const { ebookId, title, description, stars_price, is_paid, price, currency, cover_url, pdf_url } = data

        const updates = {
          title,
          description,
          stars_price: stars_price || 0,
          is_paid: is_paid || false,
          price: price || 0,
          currency: currency || 'Stars',
          updated_at: new Date().toISOString()
        }
        if (cover_url) updates.cover_url = cover_url
        if (pdf_url) updates.pdf_url = pdf_url

        const { data: ebook, error } = await supabase
          .from('ebooks')
          .update(updates)
          .eq('id', ebookId)
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: ebook })
        break
      }

      case 'deleteEbook': {
        const { ebookId } = data

        await supabase.from('unlocks').delete().eq('ebook_id', ebookId)
        
        const { error } = await supabase
          .from('ebooks')
          .delete()
          .eq('id', ebookId)

        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      // ============================================
      // UNLOCK REQUESTS MANAGEMENT
      // ============================================
      case 'getUnlockRequests': {
        const { data: unlocks, error } = await supabase
          .from('unlocks')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        const requestsWithDetails = await Promise.all((unlocks || []).map(async (unlock) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', unlock.user_id)
            .maybeSingle()

          const { data: ebook } = await supabase
            .from('ebooks')
            .select('title, stars_price, cover_url')
            .eq('id', unlock.ebook_id)
            .maybeSingle()

          return {
            ...unlock,
            user_name: profile?.name || 'Unknown',
            user_email: profile?.email || 'unknown',
            ebook_title: ebook?.title || 'Unknown',
            ebook_price: ebook?.stars_price || 0,
            ebook_cover: ebook?.cover_url || null
          }
        }))

        res.status(200).json({ success: true, data: requestsWithDetails })
        break
      }

      case 'getUnlockRequestsCount': {
        const { count, error } = await supabase
          .from('unlocks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (error) throw error
        res.status(200).json({ success: true, data: count || 0 })
        break
      }

      case 'approveUnlockRequest': {
        const { requestId } = data

        const { data: request, error } = await supabase
          .from('unlocks')
          .update({
            status: 'approved',
            admin_notes: 'Approved by admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select()
          .single()

        if (error) throw error

        if (request.payment_id) {
          await supabase
            .from('stars_payments')
            .update({ status: 'completed' })
            .eq('id', request.payment_id)
        }

        res.status(200).json({ success: true, data: request })
        break
      }

      case 'rejectUnlockRequest': {
        const { requestId, reason } = data

        const { data: request, error } = await supabase
          .from('unlocks')
          .update({
            status: 'rejected',
            admin_notes: reason || 'Rejected by admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select()
          .single()

        if (error) throw error

        if (request.payment_id) {
          await supabase
            .from('stars_payments')
            .update({ status: 'failed' })
            .eq('id', request.payment_id)
        }

        res.status(200).json({ success: true, data: request })
        break
      }

      // ============================================
      // PROFILE MANAGEMENT
      // ============================================
      case 'getProfile': {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.userId)
          .maybeSingle()

        if (error) throw error
        res.status(200).json({ data: profile, success: true })
        break
      }

      case 'createProfile': {
        const { data: profile, error } = await supabase
          .from('profiles')
          .insert([data])
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ data: profile, success: true })
        break
      }

      case 'updateProfile': {
        const { error } = await supabase
          .from('profiles')
          .update(data.updates)
          .eq('user_id', data.userId)

        if (error) throw error
        res.status(200).json({ success: true })
        break
      }

      case 'getUserUnlocks': {
        const { data: unlocks, error } = await supabase
          .from('unlocks')
          .select(`*, ebook:ebooks(*)`)
          .eq('user_id', data.userId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })

        if (error) throw error
        res.status(200).json({ data: unlocks || [], success: true })
        break
      }

      case 'getUserSavedEbooks': {
        const { data: saved, error } = await supabase
          .from('saved_ebooks')
          .select(`*, ebook:ebooks(*)`)
          .eq('user_id', data.userId)

        if (error) throw error
        res.status(200).json({ data: saved || [], success: true })
        break
      }

      case 'getUserPayments': {
        const { data: payments, error } = await supabase
          .from('stars_payments')
          .select('*')
          .eq('user_id', data.userId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        res.status(200).json({ data: payments || [], success: true })
        break
      }

      // ============================================
      // ADMIN DASHBOARD STATS
      // ============================================
      case 'getAdminStats': {
        const [
          { count: totalUsers },
          { count: totalPosts },
          { count: totalQuotes },
          { count: totalVideos },
          { count: totalEbooks },
          { count: pendingUnlocks },
          { count: approvedUnlocks }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('quotes').select('*', { count: 'exact', head: true }),
          supabase.from('videos').select('*', { count: 'exact', head: true }),
          supabase.from('ebooks').select('*', { count: 'exact', head: true }),
          supabase.from('unlocks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('unlocks').select('*', { count: 'exact', head: true }).eq('status', 'approved')
        ])

        const [
          { count: postLikes },
          { count: quoteLikes },
          { count: videoLikes },
          { count: postComments },
          { count: videoComments }
        ] = await Promise.all([
          supabase.from('post_likes').select('*', { count: 'exact', head: true }),
          supabase.from('quote_likes').select('*', { count: 'exact', head: true }),
          supabase.from('video_likes').select('*', { count: 'exact', head: true }),
          supabase.from('comments').select('*', { count: 'exact', head: true }),
          supabase.from('video_comments').select('*', { count: 'exact', head: true })
        ])

        const totalLikes = (postLikes || 0) + (quoteLikes || 0) + (videoLikes || 0)
        const totalComments = (postComments || 0) + (videoComments || 0)

        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        
        const { count: newUsersLastMonth } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())

        const { count: newPostsLastMonth } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())

        res.status(200).json({
          success: true,
          data: {
            totalUsers: totalUsers || 0,
            totalPosts: totalPosts || 0,
            totalQuotes: totalQuotes || 0,
            totalVideos: totalVideos || 0,
            totalEbooks: totalEbooks || 0,
            totalLikes: totalLikes,
            totalComments: totalComments,
            pendingUnlocks: pendingUnlocks || 0,
            approvedUnlocks: approvedUnlocks || 0,
            newUsersLastMonth: newUsersLastMonth || 0,
            newPostsLastMonth: newPostsLastMonth || 0
          }
        })
        break
      }

      case 'getUsersByCountry': {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('country')

        const countryCount = {}
        profiles?.forEach(profile => {
          const country = profile.country || 'Not specified'
          countryCount[country] = (countryCount[country] || 0) + 1
        })

        res.status(200).json({ success: true, data: countryCount })
        break
      }

      case 'getRecentUnlocks': {
        const { data: unlocks } = await supabase
          .from('unlocks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(data.limit || 5)

        const unlocksWithDetails = await Promise.all((unlocks || []).map(async (unlock) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', unlock.user_id)
            .maybeSingle()

          const { data: ebook } = await supabase
            .from('ebooks')
            .select('title')
            .eq('id', unlock.ebook_id)
            .maybeSingle()

          return {
            ...unlock,
            user_name: profile?.name || 'Unknown',
            user_email: profile?.email || 'Unknown',
            ebook_title: ebook?.title || 'Unknown'
          }
        }))

        res.status(200).json({ success: true, data: unlocksWithDetails })
        break
      }

      case 'getRecentComments': {
        const { data: comments } = await supabase
          .from('comments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(data.limit || 5)

        const commentsWithDetails = await Promise.all((comments || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', comment.user_id)
            .maybeSingle()

          const { data: post } = await supabase
            .from('posts')
            .select('title')
            .eq('id', comment.post_id)
            .maybeSingle()

          return {
            ...comment,
            user_name: profile?.name || 'Unknown',
            user_email: profile?.email || 'Unknown',
            post_title: post?.title || 'Unknown'
          }
        }))

        res.status(200).json({ success: true, data: commentsWithDetails })
        break
      }

      case 'getActivityData': {
        const days = data.days || 30
        const labels = []
        const userData = []
        const postData = []
        const commentData = []

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)
          const nextDate = new Date(date)
          nextDate.setDate(nextDate.getDate() + 1)

          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          labels.push(dateStr)

          const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDate.toISOString())

          const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDate.toISOString())

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDate.toISOString())

          userData.push(usersCount || 0)
          postData.push(postsCount || 0)
          commentData.push(commentsCount || 0)
        }

        res.status(200).json({
          success: true,
          data: { labels, users: userData, posts: postData, comments: commentData }
        })
        break
      }

      case 'getSupportTickets': {
        const { data: tickets, error } = await supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        res.status(200).json({ success: true, data: tickets || [] })
        break
      }

      case 'updateTicketStatus': {
        const { ticketId, status } = data

        const { data: ticket, error } = await supabase
          .from('support_tickets')
          .update({
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', ticketId)
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: ticket })
        break
      }

      case 'resolveTicket': {
        const { ticketId, response } = data

        const { data: ticket, error } = await supabase
          .from('support_tickets')
          .update({
            status: 'resolved',
            admin_response: response,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', ticketId)
          .select()
          .single()

        if (error) throw error
        res.status(200).json({ success: true, data: ticket })
        break
      }

      case 'getSettings': {
        const { key } = data

        const { data: setting, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', key)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') throw error
        res.status(200).json({ success: true, data: setting })
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