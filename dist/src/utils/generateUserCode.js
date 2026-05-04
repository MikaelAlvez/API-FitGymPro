"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUserCode = generateUserCode;
// Gera código no formato: STU-ABC123 ou PER-ABC123
async function generateUserCode(prisma, role) {
    const prefix = role === 'STUDENT' ? 'STU' : 'PER';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let exists = true;
    do {
        const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        code = `${prefix}-${random}`;
        exists = !!(await prisma.user.findUnique({ where: { userCode: code } }));
    } while (exists);
    return code;
}
//# sourceMappingURL=generateUserCode.js.map