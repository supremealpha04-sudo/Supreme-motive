import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const form = formidable({})
  
  try {
    const [fields, files] = await form.parse(req)
    const userId = fields.userId?.[0]
    const folder = fields.folder?.[0] || 'ebooks'
    const file = files.file?.[0]
    
    if (!userId || !file) {
      res.status(400).json({ error: 'Missing userId or file' })
      return
    }
    
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = file.originalFilename.split('.').pop()
    const fileName = `${folder}/${userId}-${timestamp}-${random}.${ext}`
    
    const fileBuffer = fs.readFileSync(file.filepath)
    
    const { error: uploadError } = await supabase.storage
      .from('suprememotive-assets')
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        upsert: true
      })
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
      .from('suprememotive-assets')
      .getPublicUrl(fileName)
    
    res.status(200).json({ publicUrl, success: true })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: error.message, success: false })
  }
}