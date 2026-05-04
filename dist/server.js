"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const fastify_1 = __importDefault(require("fastify"));
const prisma_1 = __importDefault(require("./plugins/prisma"));
const jwt_1 = __importDefault(require("./plugins/jwt"));
const multipart_1 = __importDefault(require("./plugins/multipart"));
const auth_routes_1 = require("./modules/auth/auth.routes");
const upload_routes_1 = require("./modules/upload/upload.routes");
const user_routes_1 = require("./modules/user/user.routes");
const personal_request_routes_1 = require("./modules/personal-request/personal-request.routes");
const workout_routes_1 = require("./modules/workout/workout.routes");
const session_routes_1 = require("./modules/workout/session.routes");
const stats_routes_1 = require("./modules/workout/stats.routes");
const friend_routes_1 = require("./modules/friend/friend.routes");
const group_routes_1 = require("./modules/group/group.routes");
const app = (0, fastify_1.default)({ logger: true });
// ─── Plugins ─────────────────────────────────
app.register(prisma_1.default);
app.register(jwt_1.default);
app.register(multipart_1.default);
// ─── Rotas ───────────────────────────────────
app.register(auth_routes_1.authRoutes, { prefix: '/auth' });
app.register(upload_routes_1.uploadRoutes);
app.register(user_routes_1.userRoutes);
app.register(personal_request_routes_1.personalRequestRoutes);
app.register(workout_routes_1.workoutRoutes);
app.register(session_routes_1.sessionRoutes);
app.register(stats_routes_1.statsRoutes);
app.register(friend_routes_1.friendRoutes);
app.register(group_routes_1.groupRoutes);
app.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));
// ─── Start ────────────────────────────────────
const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3333;
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`Server running on http://localhost:${port}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map