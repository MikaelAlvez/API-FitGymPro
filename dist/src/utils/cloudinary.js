"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = uploadToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
async function uploadToCloudinary(buffer, folder, filename) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: filename,
            overwrite: true,
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        }, (error, result) => {
            if (error || !result)
                return reject(error);
            resolve(result.secure_url);
        });
        const readable = new stream_1.Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
}
async function deleteFromCloudinary(url) {
    try {
        // Extrai public_id da URL
        const parts = url.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder = parts[parts.length - 2];
        await cloudinary_1.v2.uploader.destroy(`${folder}/${filename}`);
    }
    catch { /* silencia */ }
}
//# sourceMappingURL=cloudinary.js.map