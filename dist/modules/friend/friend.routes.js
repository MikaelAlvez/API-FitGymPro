"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendRoutes = friendRoutes;
async function friendRoutes(app) {
    // ─── POST /friends/request/:userId ── Enviar solicitação
    app.post('/friends/request/:userId', { preHandler: [app.authenticate] }, async (req, reply) => {
        const senderId = req.user.sub;
        const { userId: receiverId } = req.params;
        if (senderId === receiverId)
            return reply.status(400).send({ message: 'Você não pode se adicionar.' });
        const receiver = await req.server.prisma.user.findUnique({ where: { id: receiverId } });
        if (!receiver)
            return reply.status(404).send({ message: 'Usuário não encontrado.' });
        const existing = await req.server.prisma.friendRequest.findFirst({
            where: { OR: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }] },
        });
        if (existing) {
            if (existing.status === 'ACCEPTED')
                return reply.status(409).send({ message: 'Vocês já são amigos.' });
            if (existing.status === 'PENDING')
                return reply.status(409).send({ message: 'Solicitação já enviada.' });
            const updated = await req.server.prisma.friendRequest.update({
                where: { id: existing.id },
                data: { status: 'PENDING', senderId, receiverId },
            });
            return reply.status(200).send(updated);
        }
        const request = await req.server.prisma.friendRequest.create({ data: { senderId, receiverId } });
        return reply.status(201).send(request);
    });
    // ─── PUT /friends/request/:requestId/accept
    app.put('/friends/request/:requestId/accept', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { requestId } = req.params;
        const userId = req.user.sub;
        const request = await req.server.prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request || request.receiverId !== userId)
            return reply.status(404).send({ message: 'Solicitação não encontrada.' });
        if (request.status !== 'PENDING')
            return reply.status(409).send({ message: 'Solicitação já processada.' });
        const updated = await req.server.prisma.friendRequest.update({
            where: { id: requestId }, data: { status: 'ACCEPTED' },
        });
        return reply.status(200).send(updated);
    });
    // ─── PUT /friends/request/:requestId/reject
    app.put('/friends/request/:requestId/reject', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { requestId } = req.params;
        const userId = req.user.sub;
        const request = await req.server.prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request || request.receiverId !== userId)
            return reply.status(404).send({ message: 'Solicitação não encontrada.' });
        await req.server.prisma.friendRequest.update({
            where: { id: requestId }, data: { status: 'REJECTED' },
        });
        return reply.status(200).send({ message: 'Solicitação recusada.' });
    });
    // ─── DELETE /friends/:userId
    app.delete('/friends/:userId', { preHandler: [app.authenticate] }, async (req, reply) => {
        const myId = req.user.sub;
        const { userId: otherId } = req.params;
        await req.server.prisma.friendRequest.deleteMany({
            where: { OR: [{ senderId: myId, receiverId: otherId }, { senderId: otherId, receiverId: myId }] },
        });
        return reply.status(200).send({ message: 'Amizade desfeita.' });
    });
    // ─── GET /friends
    app.get('/friends', { preHandler: [app.authenticate] }, async (req, reply) => {
        const userId = req.user.sub;
        const requests = await req.server.prisma.friendRequest.findMany({
            where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
            include: {
                sender: { select: { id: true, name: true, avatar: true, userCode: true, role: true } },
                receiver: { select: { id: true, name: true, avatar: true, userCode: true, role: true } },
            },
        });
        const friends = requests.map(r => r.senderId === userId ? r.receiver : r.sender);
        return reply.status(200).send(friends);
    });
    // ─── GET /friends/requests/pending
    app.get('/friends/requests/pending', { preHandler: [app.authenticate] }, async (req, reply) => {
        const userId = req.user.sub;
        const requests = await req.server.prisma.friendRequest.findMany({
            where: { receiverId: userId, status: 'PENDING' },
            include: { sender: { select: { id: true, name: true, avatar: true, userCode: true, role: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return reply.status(200).send(requests);
    });
    // ─── GET /friends/status/:userId
    app.get('/friends/status/:userId', { preHandler: [app.authenticate] }, async (req, reply) => {
        const myId = req.user.sub;
        const { userId: otherId } = req.params;
        const request = await req.server.prisma.friendRequest.findFirst({
            where: { OR: [{ senderId: myId, receiverId: otherId }, { senderId: otherId, receiverId: myId }] },
        });
        if (!request)
            return reply.status(200).send({ status: null });
        return reply.status(200).send({ status: request.status, requestId: request.id, isSender: request.senderId === myId });
    });
    // ─── GET /friends/feed ── Feed com likes e comentários
    app.get('/friends/feed', { preHandler: [app.authenticate] }, async (req, reply) => {
        const userId = req.user.sub;
        const { page = '1' } = req.query;
        const take = 20;
        const skip = (parseInt(page) - 1) * take;
        const friendRequests = await req.server.prisma.friendRequest.findMany({
            where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
            select: { senderId: true, receiverId: true },
        });
        const friendIds = friendRequests.map(r => r.senderId === userId ? r.receiverId : r.senderId);
        const sessions = await req.server.prisma.workoutSession.findMany({
            where: { finishedAt: { not: null }, studentId: { in: [userId, ...friendIds] } },
            include: {
                workout: { select: { id: true, name: true } },
                student: { select: { id: true, name: true, avatar: true, userCode: true } },
                // likes com info de quem curtiu
                likes: {
                    select: { id: true, userId: true, user: { select: { id: true, name: true } } },
                },
                // comentários com info do autor
                comments: {
                    include: { user: { select: { id: true, name: true, avatar: true } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { startedAt: 'desc' },
            take,
            skip,
        });
        // Adiciona flag se o usuário logado curtiu cada sessão
        const result = sessions.map(s => ({
            ...s,
            likeCount: s.likes.length,
            likedByMe: s.likes.some(l => l.userId === userId),
            commentCount: s.comments.length,
        }));
        return reply.status(200).send(result);
    });
    // ─── POST /sessions/:sessionId/like ── Curtir/descurtir (toggle)
    app.post('/sessions/:sessionId/like', { preHandler: [app.authenticate] }, async (req, reply) => {
        const userId = req.user.sub;
        const { sessionId } = req.params;
        const session = await req.server.prisma.workoutSession.findUnique({ where: { id: sessionId } });
        if (!session)
            return reply.status(404).send({ message: 'Sessão não encontrada.' });
        const existing = await req.server.prisma.sessionLike.findUnique({
            where: { sessionId_userId: { sessionId, userId } },
        });
        if (existing) {
            await req.server.prisma.sessionLike.delete({ where: { id: existing.id } });
            return reply.status(200).send({ liked: false });
        }
        await req.server.prisma.sessionLike.create({ data: { sessionId, userId } });
        return reply.status(201).send({ liked: true });
    });
    // ─── POST /sessions/:sessionId/comments ── Comentar
    app.post('/sessions/:sessionId/comments', { preHandler: [app.authenticate] }, async (req, reply) => {
        const userId = req.user.sub;
        const { sessionId } = req.params;
        const { text } = req.body;
        if (!text?.trim())
            return reply.status(400).send({ message: 'Comentário não pode ser vazio.' });
        const session = await req.server.prisma.workoutSession.findUnique({ where: { id: sessionId } });
        if (!session)
            return reply.status(404).send({ message: 'Sessão não encontrada.' });
        const comment = await req.server.prisma.sessionComment.create({
            data: { sessionId, userId, text: text.trim() },
            include: { user: { select: { id: true, name: true, avatar: true } } },
        });
        return reply.status(201).send(comment);
    });
    // ─── GET /sessions/:sessionId/comments ── Listar comentários
    app.get('/sessions/:sessionId/comments', { preHandler: [app.authenticate] }, async (req, reply) => {
        const { sessionId } = req.params;
        const comments = await req.server.prisma.sessionComment.findMany({
            where: { sessionId },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'asc' },
        });
        return reply.status(200).send(comments);
    });
    // ─── DELETE /sessions/comments/:commentId ── Deletar comentário
    app.delete('/sessions/comments/:commentId', { preHandler: [app.authenticate] }, async (req, reply) => {
        const userId = req.user.sub;
        const { commentId } = req.params;
        const comment = await req.server.prisma.sessionComment.findUnique({ where: { id: commentId } });
        if (!comment || comment.userId !== userId)
            return reply.status(403).send({ message: 'Sem permissão.' });
        await req.server.prisma.sessionComment.delete({ where: { id: commentId } });
        return reply.status(200).send({ message: 'Comentário removido.' });
    });
}
//# sourceMappingURL=friend.routes.js.map