"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', controller_1.login);
router.post('/register', controller_1.register);
router.post('/forgot-password', controller_1.forgotPassword);
router.post('/reset-password', controller_1.resetPassword);
router.post('/change-password', auth_1.authenticateToken, controller_1.changePassword);
exports.default = router;
//# sourceMappingURL=routes.js.map