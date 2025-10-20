"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const controller_1 = require("../modules/user/controller");
const validation_1 = require("../utils/validation");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
const idParamSchema = joi_1.default.object({
    id: joi_1.default.string().uuid().required().messages({
        'string.guid': 'ID must be a valid UUID',
        'any.required': 'ID is required'
    })
});
router.use(auth_1.authenticateToken);
router.get('/profile', (req, res) => {
    res.json({
        success: true,
        message: 'User profile endpoint',
        data: req.user
    });
});
router.put('/profile', (req, res) => {
    res.json({
        success: true,
        message: 'Update profile endpoint - Coming soon'
    });
});
router.get('/', (0, auth_1.requireRole)(['admin']), controller_1.getAllUsers);
router.get('/:id', (0, validation_1.validateParams)(idParamSchema), (0, auth_1.requireRole)(['admin', 'manager']), controller_1.getUserById);
router.post('/', (0, auth_1.requireRole)(['admin']), controller_1.createUser);
router.put('/:id', (0, validation_1.validateParams)(idParamSchema), (0, auth_1.requireRole)(['admin']), controller_1.updateUser);
router.delete('/:id', (0, validation_1.validateParams)(idParamSchema), (0, auth_1.requireRole)(['admin']), controller_1.deleteUser);
router.patch('/:id/toggle-status', (0, validation_1.validateParams)(idParamSchema), (0, auth_1.requireRole)(['admin']), controller_1.toggleUserStatus);
exports.default = router;
//# sourceMappingURL=user.js.map