"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGroupCode = generateGroupCode;
async function generateGroupCode(prisma) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let exists = true;
    do {
        const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        code = `GRP-${random}`;
        exists = !!(await prisma.group.findUnique({ where: { code } }));
    } while (exists);
    return code;
}
//# sourceMappingURL=generateGroupCode.js.map