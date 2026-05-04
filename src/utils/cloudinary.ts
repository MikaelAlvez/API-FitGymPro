import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  filename?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        overwrite:    true,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error || !result) return reject(error)
        resolve(result.secure_url)
      },
    )
    const readable = new Readable()
    readable.push(buffer)
    readable.push(null)
    readable.pipe(uploadStream)
  })
}

export async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    // Extrai public_id da URL
    const parts    = url.split('/')
    const filename = parts[parts.length - 1].split('.')[0]
    const folder   = parts[parts.length - 2]
    await cloudinary.uploader.destroy(`${folder}/${filename}`)
  } catch { /* silencia */ }
}