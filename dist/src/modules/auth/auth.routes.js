"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_controller_1 = require("./auth.controller");
const register_controller_1 = require("./register.controller");
async function authRoutes(app) {
    // Cadastro
    app.post('/register/student', register_controller_1.registerStudentController);
    app.post('/register/personal', register_controller_1.registerPersonalController);
    // Verificações
    app.post('/check-email', auth_controller_1.checkEmailController);
    app.post('/check-cpf', auth_controller_1.checkCpfController);
    // Públicas
    app.post('/login', auth_controller_1.loginController);
    app.post('/refresh', auth_controller_1.refreshController);
    app.post('/logout', auth_controller_1.logoutController);
    // Protegidas
    app.get('/me', { preHandler: [app.authenticate] }, auth_controller_1.meController);
    app.get('/me/profile', { preHandler: [app.authenticate] }, auth_controller_1.meProfileController);
}
//# sourceMappingURL=auth.routes.js.map