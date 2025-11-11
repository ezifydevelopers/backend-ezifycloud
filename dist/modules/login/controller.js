"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.forgotPassword = exports.register = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const app_1 = require("../../config/app");
const schema_1 = require("./schema");
const login = async (req, res, next) => {
    try {
        const { error, value } = schema_1.loginSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
            return;
        }
        const { email, password } = value;
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                department: true,
                managerId: true,
                profilePicture: true,
                passwordHash: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact administrator.'
            });
            return;
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
            return;
        }
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role
        }, app_1.APP_CONFIG.JWT.SECRET, { expiresIn: app_1.APP_CONFIG.JWT.EXPIRES_IN });
        const { passwordHash, ...userWithoutPassword } = user;
        const response = {
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutPassword,
                token
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const register = async (req, res, next) => {
    try {
        const { error, value } = schema_1.registerSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
            return;
        }
        const { name, email, password, role, department, manager_id } = value;
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
            return;
        }
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        let assignedManagerId = manager_id;
        if (!assignedManagerId && role === 'employee') {
            const BusinessRulesService = (await Promise.resolve().then(() => __importStar(require('../../services/businessRulesService')))).default;
            const assignmentResult = await BusinessRulesService.autoAssignManager({
                role,
                department,
                managerId: manager_id
            });
            if (assignmentResult.isValid && assignmentResult.assignedManagerId) {
                assignedManagerId = assignmentResult.assignedManagerId;
                console.log(`✅ Auto-assigned manager: ${assignmentResult.assignmentReason}`);
            }
            else {
                console.log(`⚠️ Auto-assignment failed: ${assignmentResult.message}`);
                if (assignmentResult.warnings) {
                    console.log(`⚠️ Warnings: ${assignmentResult.warnings.join(', ')}`);
                }
            }
        }
        const newUser = await prisma_1.default.user.create({
            data: {
                name,
                email,
                passwordHash,
                role,
                department,
                managerId: assignedManagerId,
                isActive: true
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                department: true,
                managerId: true,
                profilePicture: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
        const token = jsonwebtoken_1.default.sign({
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role
        }, jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        const response = {
            success: true,
            message: 'Registration successful',
            data: {
                user: newUser,
                token
            }
        };
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const forgotPassword = async (req, res, next) => {
    try {
        const { error, value } = schema_1.forgotPasswordSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
            return;
        }
        const { email } = value;
        const user = await prisma_1.default.user.findFirst({
            where: {
                email,
                isActive: true
            },
            select: {
                id: true,
                name: true
            }
        });
        if (!user) {
            res.status(200).json({
                success: true,
                message: 'If the email exists, a password reset link has been sent'
            });
            return;
        }
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
        const resetToken = jsonwebtoken_1.default.sign({ userId: user.id, email }, jwtSecret, { expiresIn: '1h' });
        console.log(`Password reset token for ${email}: ${resetToken}`);
        const response = {
            success: true,
            message: 'If the email exists, a password reset link has been sent'
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    try {
        const { error, value } = schema_1.resetPasswordSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
            return;
        }
        const { token, password } = value;
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const { userId } = decoded;
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        const updateResult = await prisma_1.default.user.updateMany({
            where: {
                id: userId,
                isActive: true
            },
            data: {
                passwordHash,
                updatedAt: new Date()
            }
        });
        if (updateResult.count === 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
            return;
        }
        const response = {
            success: true,
            message: 'Password reset successful'
        };
        res.status(200).json(response);
    }
    catch (error) {
        if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
            return;
        }
        next(error);
    }
};
exports.resetPassword = resetPassword;
const changePassword = async (req, res, next) => {
    try {
        const { error, value } = schema_1.changePasswordSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
            return;
        }
        const { currentPassword, newPassword } = value;
        const userId = req.user.id;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true }
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
            return;
        }
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                updatedAt: new Date()
            }
        });
        const response = {
            success: true,
            message: 'Password changed successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=controller.js.map