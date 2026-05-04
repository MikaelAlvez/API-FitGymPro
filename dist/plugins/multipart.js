"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const multipartPlugin = (0, fastify_plugin_1.default)(async (server) => {
    server.register(multipart_1.default, {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
            files: 1,
        },
    });
});
exports.default = multipartPlugin;
//# sourceMappingURL=multipart.js.map