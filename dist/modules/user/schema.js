"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleUserStatusSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createUserSchema = joi_1.default.object({
    name: joi_1.default.string()
        .min(2)
        .max(50)
        .required()
        .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
    }),
    email: joi_1.default.string()
        .email()
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string()
        .min(6)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
        .required()
        .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required'
    }),
    role: joi_1.default.string()
        .valid('admin', 'manager', 'employee')
        .default('employee')
        .messages({
        'any.only': 'Role must be admin, manager, or employee'
    }),
    department: joi_1.default.string()
        .max(100)
        .optional()
        .messages({
        'string.max': 'Department name cannot exceed 100 characters'
    }),
    manager_id: joi_1.default.string()
        .uuid()
        .allow(null)
        .optional()
        .messages({
        'string.guid': 'Manager ID must be a valid UUID'
    }),
    isActive: joi_1.default.boolean()
        .default(true)
        .messages({
        'boolean.base': 'isActive must be a boolean value'
    })
});
exports.updateUserSchema = joi_1.default.object({
    name: joi_1.default.string()
        .min(2)
        .max(50)
        .optional()
        .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
    }),
    email: joi_1.default.string()
        .email()
        .optional()
        .messages({
        'string.email': 'Please provide a valid email address'
    }),
    role: joi_1.default.string()
        .valid('admin', 'manager', 'employee')
        .optional()
        .messages({
        'any.only': 'Role must be admin, manager, or employee'
    }),
    department: joi_1.default.string()
        .max(100)
        .allow(null)
        .optional()
        .messages({
        'string.max': 'Department name cannot exceed 100 characters'
    }),
    manager_id: joi_1.default.string()
        .uuid()
        .allow(null)
        .optional()
        .messages({
        'string.guid': 'Manager ID must be a valid UUID'
    }),
    isActive: joi_1.default.boolean()
        .optional()
        .messages({
        'boolean.base': 'isActive must be a boolean value'
    })
});
exports.toggleUserStatusSchema = joi_1.default.object({
    isActive: joi_1.default.boolean()
        .required()
        .messages({
        'boolean.base': 'isActive must be a boolean value',
        'any.required': 'isActive is required'
    })
});
//# sourceMappingURL=schema.js.map