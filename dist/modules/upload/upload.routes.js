"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = uploadRoutes;
const cloudinary_1 = require("../../utils/cloudinary");
async function uploadRoutes(app) {
    // POST /upload/avatar
    app.post('/upload/avatar', { preHandler: [app.authenticate] }, async (req, reply) => {
        const data = await req.file();
        if (!data)
            return reply.status(400).send({ message: 'Nenhum arquivo enviado.' });
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(data.mimetype))
            return reply.status(400).send({ message: 'Formato inválido. Use JPEG, PNG ou WebP.' });
        try {
            const buffer = await data.toBuffer();
            const userId = req.user.sub;
            const url = await (0, cloudinary_1.uploadToCloudinary)(buffer, 'fitgym/avatars', `avatar_${userId}`);
            return reply.status(200).send({ url });
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ message: 'Erro ao enviar imagem.' });
        }
    });
    // POST /upload/session
    app.post('/upload/session', { preHandler: [app.authenticate] }, async (req, reply) => {
        const data = await req.file();
        if (!data)
            return reply.status(400).send({ message: 'Nenhum arquivo enviado.' });
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(data.mimetype))
            return reply.status(400).send({ message: 'Formato inválido. Use JPEG, PNG ou WebP.' });
        try {
            const buffer = await data.toBuffer();
            const userId = req.user.sub;
            const timestamp = Date.now();
            const url = await (0, cloudinary_1.uploadToCloudinary)(buffer, 'fitgym/sessions', `session_${userId}_${timestamp}`);
            return reply.status(200).send({ url });
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ message: 'Erro ao enviar imagem.' });
        }
    });
}
//# sourceMappingURL=upload.routes.js.map