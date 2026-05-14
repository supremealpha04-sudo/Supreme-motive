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
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false })
  }

  try {
    const { action, data } = req.body

    if (!action) {
      return res.status(400).json({ error: 'Action is required', success: false })
    }

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

        return res.status(200).json({ success: true, data: quotesWithStats })
      }

      case 'getQuoteLikeCount': {
        const { quoteId } = data
        
        const { count, error } = await supabase
          .from('quote_likes')
          .select('*', { count: 'exact', head: true })
          .eq('quote_id', quoteId)
          
        if (error) throw error
        
        return res.status(200).json({ count: count || 0, success: true })
      }

      case 'getUserQuoteLikes': {
        const { userId } = data
        
        const { data: likes, error } = await supabase
          .from('quote_likes')
          .select('quote_id')
          .eq('user_id', userId)
          
        if (error) throw error
        
        return res.status(200).json({ data: likes || [], success: true })
      }

      case 'getUserQuoteSaves': {
        const { userId } = data
        
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
        
        return res.status(200).json({ success: true, data: quote })
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
        
        return res.status(200).json({ success: true, data: quote })
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
        
        return res.status(200).json({ success: true })
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

        return res.status(200).json({ success: true, data: postsWithStats })
      }

      case 'getUserPostLikes': {
        const { userId } = data
        
        const { data: likes, error } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId)
          
        if (error) throw error
        
        return res.status(200).json({ data: likes || [], success: true })
      }

      case 'likePost': {
        const { postId, userId } = data
        
        const { error } = await supabase
          .from('post_likes')
          .insert([{ post_id: postId, user_id: userId }])
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'unlikePost': {
        const { postId, userId } = data
        
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'getComments': {
        const { postId } = data
        
        const { data: comments, error } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          
        if (error) throw error
        
        const userIds = [...new Set((comments || []).map(c => c.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds)
        
        const userMap = new Map()
        if (profiles) {
          profiles.forEach(p => userMap.set(p.id, p.name))
        }
        
        const commentsWithNames = (comments || []).map(comment => ({
          ...comment,
          author_name: userMap.get(comment.user_id) || 'User'
        }))
        
        return res.status(200).json({ data: commentsWithNames || [], success: true })
      }

      case 'addComment': {
        const { postId, userId, content } = data
        
        const { error } = await supabase
          .from('comments')
          .insert([{
            post_id: postId,
            user_id: userId,
            content: content
          }])
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'addReply': {
        const { postId, userId, content, parentCommentId } = data
        
        const { error } = await supabase
          .from('comments')
          .insert([{
            post_id: postId,
            user_id: userId,
            content: content,
            parent_comment_id: parentCommentId
          }])
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
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
        
        return res.status(200).json({ success: true, data: post })
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
        
        return res.status(200).json({ success: true, data: post })
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
        
        return res.status(200).json({ success: true })
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

        return res.status(200).json({ success: true, data: videosWithStats })
      }

      case 'getUserVideoLikes': {
        const { userId } = data
        
        const { data: likes, error } = await supabase
          .from('video_likes')
          .select('video_id')
          .eq('user_id', userId)
          
        if (error) throw error
        
        return res.status(200).json({ data: likes || [], success: true })
      }

      case 'likeVideo': {
        const { videoId, userId } = data
        
        const { error } = await supabase
          .from('video_likes')
          .insert([{ video_id: videoId, user_id: userId }])
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'unlikeVideo': {
        const { videoId, userId } = data
        
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', userId)
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'recordVideoView': {
        const { videoId, userId } = data
        
        const { error } = await supabase
          .from('video_views')
          .upsert([{ video_id: videoId, user_id: userId }], { onConflict: 'video_id,user_id' })
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'getVideoComments': {
        const { videoId } = data
        
        const { data: comments, error } = await supabase
          .from('video_comments')
          .select('*')
          .eq('video_id', videoId)
          .order('created_at', { ascending: true })
          
        if (error) throw error
        
        const userIds = [...new Set((comments || []).map(c => c.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds)
        
        const userMap = new Map()
        if (profiles) {
          profiles.forEach(p => userMap.set(p.id, p.name))
        }
        
        const commentsWithNames = (comments || []).map(comment => ({
          ...comment,
          author_name: userMap.get(comment.user_id) || 'User'
        }))
        
        return res.status(200).json({ data: commentsWithNames || [], success: true })
      }

      case 'addVideoComment': {
        const { videoId, userId, content } = data
        
        const { error } = await supabase
          .from('video_comments')
          .insert([{
            video_id: videoId,
            user_id: userId,
            content: content
          }])
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'addVideoReply': {
        const { videoId, userId, content, parentCommentId } = data
        
        const { error } = await supabase
          .from('video_comments')
          .insert([{
            video_id: videoId,
            user_id: userId,
            content: content,
            parent_id: parentCommentId
          }])
          
        if (error) throw error
        
        return res.status(200).json({ success: true })
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
        
        return res.status(200).json({ success: true, data: video })
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
        
        return res.status(200).json({ success: true, data: video })
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
        
        return res.status(200).json({ success: true })
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

        return res.status(200).json({ success: true, data: ebooksWithStats })
      }

      case 'getUserUnlocks': {
        const { userId } = data
        
        const { data: unlocks, error } = await supabase
          .from('unlocks')
          .select(`*, ebook:ebooks(*)`)
          .eq('user_id', userId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })

        if (error) throw error
        
        return res.status(200).json({ data: unlocks || [], success: true })
      }

      case 'getUserSavedEbooks': {
        const { userId } = data
        
        const { data: saved, error } = await supabase
          .from('saved_ebooks')
          .select(`*, ebook:ebooks(*)`)
          .eq('user_id', userId)

        if (error) throw error
        
        return res.status(200).json({ data: saved || [], success: true })
      }

      case 'getUserPayments': {
        const { userId } = data
        
        const { data: payments, error } = await supabase
          .from('stars_payments')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        
        return res.status(200).json({ data: payments || [], success: true })
      }

      case 'checkSavedEbook': {
        const { ebookId, userId } = data
        
        const { data: saved, error } = await supabase
          .from('saved_ebooks')
          .select('*')
          .eq('ebook_id', ebookId)
          .eq('user_id', userId)
          .maybeSingle()

        if (error) throw error
        
        return res.status(200).json({ exists: !!saved, success: true })
      }

      case 'saveEbook': {
        const { ebookId, userId } = data
        
        const { error } = await supabase
          .from('saved_ebooks')
          .insert([{ ebook_id: ebookId, user_id: userId }])

        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'unsaveEbook': {
        const { ebookId, userId } = data
        
        const { error } = await supabase
          .from('saved_ebooks')
          .delete()
          .eq('ebook_id', ebookId)
          .eq('user_id', userId)

        if (error) throw error
        
        return res.status(200).json({ success: true })
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
        
        return res.status(200).json({ success: true, data: ebook })
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
        
        return res.status(200).json({ success: true, data: ebook })
      }

      case 'deleteEbook': {
        const { ebookId } = data

        await supabase.from('unlocks').delete().eq('ebook_id', ebookId)
        
        const { error } = await supabase
          .from('ebooks')
          .delete()
          .eq('id', ebookId)

        if (error) throw error
        
        return res.status(200).json({ success: true })
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

        return res.status(200).json({ success: true, data: requestsWithDetails })
      }

      case 'getUnlockRequestsCount': {
        const { count, error } = await supabase
          .from('unlocks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (error) throw error
        
        return res.status(200).json({ success: true, data: count || 0 })
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

        return res.status(200).json({ success: true, data: request })
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

        return res.status(200).json({ success: true, data: request })
      }

      case 'createStarsPayment': {
        const { paymentId, userId, userEmail, ebookId, ebookTitle, starsAmount } = data

        const { data: payment, error } = await supabase
          .from('stars_payments')
          .insert([{
            id: paymentId,
            user_id: userId,
            user_email: userEmail,
            ebook_id: ebookId,
            ebook_title: ebookTitle,
            stars_amount: starsAmount,
            status: 'pending',
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error
        
        return res.status(200).json({ data: payment, success: true })
      }

      case 'checkPaymentStatus': {
        const { paymentId } = data

        const { data: payment, error } = await supabase
          .from('stars_payments')
          .select('status')
          .eq('id', paymentId)
          .single()

        if (error) throw error
        
        return res.status(200).json({ status: payment?.status || 'pending', success: true })
      }

      case 'createUnlock': {
        const { userId, ebookId, paymentId } = data

        const { data: unlock, error } = await supabase
          .from('unlocks')
          .insert([{
            user_id: userId,
            ebook_id: ebookId,
            status: 'approved',
            payment_method: 'telegram_stars',
            payment_id: paymentId,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error && error.code !== '23505') throw error
        
        return res.status(200).json({ data: unlock, success: true })
      }

      // ============================================
      // PROFILE MANAGEMENT
      // ============================================
      case 'getProfile': {
        const { userId } = data
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) throw error
        
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

        if (error) throw error
        
        return res.status(200).json({ data: profile, success: true })
      }

      case 'updateProfile': {
        const { userId, updates } = data
        
        const { error } = await supabase
          .from('profiles')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', userId)

        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      // ============================================
      // NOTIFICATIONS
      // ============================================
      case 'getUserNotifications': {
        const { userId } = data
        
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        
        return res.status(200).json({ data: notifications || [], success: true })
      }

      case 'markNotificationRead': {
        const { notificationId } = data
        
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)

        if (error) throw error
        
        return res.status(200).json({ success: true })
      }

      case 'markAllNotificationsRead': {
        const { userId } = data
        
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)

        if (error) throw error
        
        return res.status(200).json({ success: true })
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

        return res.status(200).json({
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

        return res.status(200).json({ success: true, data: countryCount })
      }

      case 'getRecentUnlocks': {
        const { limit = 5 } = data
        
        const { data: unlocks } = await supabase
          .from('unlocks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)

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

        return res.status(200).json({ success: true, data: unlocksWithDetails })
      }

      case 'getRecentComments': {
        const { limit = 5 } = data
        
        const { data: comments } = await supabase
          .from('comments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)

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

        return res.status(200).json({ success: true, data: commentsWithDetails })
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

        return res.status(200).json({
          success: true,
          data: { labels, users: userData, posts: postData, comments: commentData }
        })
      }

      case 'getSupportTickets': {
        const { data: tickets, error } = await supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        
        return res.status(200).json({ success: true, data: tickets || [] })
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
        
        return res.status(200).json({ success: true, data: ticket })
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
        
        return res.status(200).json({ success: true, data: ticket })
      }

      case 'getSettings': {
        const { key } = data

        const { data: setting, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', key)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') throw error
        
        return res.status(200).json({ success: true, data: setting })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}`, success: false })
    }
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error', success: false })
  }
}
