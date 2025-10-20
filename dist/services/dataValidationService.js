"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataValidationService = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DataValidationService {
    static validateData(schema, data) {
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true
        });
        const result = {
            isValid: !error,
            errors: [],
            warnings: []
        };
        if (error) {
            result.errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                code: detail.type,
                value: detail.context?.value,
                expectedValue: detail.context?.valids?.[0]
            }));
        }
        return result;
    }
    static validateUser(data, isUpdate = false) {
        const schema = isUpdate ? this.schemas.user.update : this.schemas.user.create;
        return this.validateData(schema, data);
    }
    static validateLeaveRequest(data, isUpdate = false) {
        const schema = isUpdate ? this.schemas.leaveRequest.update : this.schemas.leaveRequest.create;
        return this.validateData(schema, data);
    }
    static validateLeavePolicy(data, isUpdate = false) {
        const schema = isUpdate ? this.schemas.leavePolicy.update : this.schemas.leavePolicy.create;
        return this.validateData(schema, data);
    }
    static validateHoliday(data, isUpdate = false) {
        const schema = isUpdate ? this.schemas.holiday.update : this.schemas.holiday.create;
        return this.validateData(schema, data);
    }
    static async validateEmailUniqueness(email, excludeUserId) {
        try {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            if (existingUser && existingUser.id !== excludeUserId) {
                return {
                    isValid: false,
                    errors: [{
                            field: 'email',
                            message: 'Email address is already in use',
                            code: 'EMAIL_EXISTS',
                            value: email
                        }],
                    warnings: []
                };
            }
            return {
                isValid: true,
                errors: [],
                warnings: []
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [{
                        field: 'email',
                        message: 'Error validating email uniqueness',
                        code: 'VALIDATION_ERROR',
                        value: email
                    }],
                warnings: []
            };
        }
    }
    static async validateManagerAssignment(managerId) {
        try {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                include: {
                    subordinates: true
                }
            });
            if (!manager) {
                return {
                    isValid: false,
                    errors: [{
                            field: 'managerId',
                            message: 'Manager not found',
                            code: 'MANAGER_NOT_FOUND',
                            value: managerId
                        }],
                    warnings: []
                };
            }
            if (manager.role !== 'manager') {
                return {
                    isValid: false,
                    errors: [{
                            field: 'managerId',
                            message: 'User is not a manager',
                            code: 'INVALID_MANAGER_ROLE',
                            value: managerId
                        }],
                    warnings: []
                };
            }
            if (!manager.isActive) {
                return {
                    isValid: false,
                    errors: [{
                            field: 'managerId',
                            message: 'Manager is not active',
                            code: 'INACTIVE_MANAGER',
                            value: managerId
                        }],
                    warnings: []
                };
            }
            const warnings = [];
            if (manager.subordinates.length >= 10) {
                warnings.push({
                    field: 'managerId',
                    message: 'Manager has reached maximum capacity (10 direct reports)',
                    suggestion: 'Consider assigning to a different manager'
                });
            }
            return {
                isValid: true,
                errors: [],
                warnings
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [{
                        field: 'managerId',
                        message: 'Error validating manager assignment',
                        code: 'VALIDATION_ERROR',
                        value: managerId
                    }],
                warnings: []
            };
        }
    }
    static async validateLeavePolicyUniqueness(leaveType, excludePolicyId) {
        try {
            const existingPolicy = await prisma.leavePolicy.findFirst({
                where: { leaveType }
            });
            if (existingPolicy && existingPolicy.id !== excludePolicyId) {
                return {
                    isValid: false,
                    errors: [{
                            field: 'leaveType',
                            message: 'Leave policy for this type already exists',
                            code: 'POLICY_EXISTS',
                            value: leaveType
                        }],
                    warnings: []
                };
            }
            return {
                isValid: true,
                errors: [],
                warnings: []
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [{
                        field: 'leaveType',
                        message: 'Error validating leave policy uniqueness',
                        code: 'VALIDATION_ERROR',
                        value: leaveType
                    }],
                warnings: []
            };
        }
    }
    static async validateHolidayDateConflicts(date, excludeHolidayId) {
        try {
            const existingHoliday = await prisma.holiday.findFirst({
                where: {
                    date: {
                        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
                    }
                }
            });
            if (existingHoliday && existingHoliday.id !== excludeHolidayId) {
                return {
                    isValid: false,
                    errors: [{
                            field: 'date',
                            message: `Holiday already exists on ${date.toLocaleDateString()}`,
                            code: 'DATE_CONFLICT',
                            value: date
                        }],
                    warnings: []
                };
            }
            return {
                isValid: true,
                errors: [],
                warnings: []
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [{
                        field: 'date',
                        message: 'Error validating holiday date conflicts',
                        code: 'VALIDATION_ERROR',
                        value: date
                    }],
                warnings: []
            };
        }
    }
    static createValidationMiddleware(schema) {
        return (req, res, next) => {
            const result = this.validateData(schema, req.body);
            if (!result.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    error: 'Invalid request data',
                    details: result.errors
                });
            }
            req.body = schema.validate(req.body, { stripUnknown: true }).value;
            return next();
        };
    }
}
exports.DataValidationService = DataValidationService;
DataValidationService.schemas = {
    user: {
        create: joi_1.default.object({
            name: joi_1.default.string()
                .min(2)
                .max(50)
                .required()
                .pattern(/^[a-zA-Z\s]+$/)
                .messages({
                'string.min': 'Name must be at least 2 characters long',
                'string.max': 'Name cannot exceed 50 characters',
                'string.pattern.base': 'Name can only contain letters and spaces',
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
                .min(8)
                .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
                .required()
                .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
                'any.required': 'Password is required'
            }),
            role: joi_1.default.string()
                .valid('admin', 'manager', 'employee')
                .required()
                .messages({
                'any.only': 'Role must be admin, manager, or employee',
                'any.required': 'Role is required'
            }),
            department: joi_1.default.string()
                .max(100)
                .optional()
                .messages({
                'string.max': 'Department name cannot exceed 100 characters'
            }),
            managerId: joi_1.default.string()
                .uuid()
                .allow(null)
                .optional()
                .messages({
                'string.guid': 'Manager ID must be a valid UUID'
            }),
            phone: joi_1.default.string()
                .pattern(/^[\+]?[1-9][\d]{0,15}$/)
                .optional()
                .messages({
                'string.pattern.base': 'Please provide a valid phone number'
            }),
            bio: joi_1.default.string()
                .max(500)
                .optional()
                .messages({
                'string.max': 'Bio cannot exceed 500 characters'
            }),
            address: joi_1.default.string()
                .max(200)
                .optional()
                .messages({
                'string.max': 'Address cannot exceed 200 characters'
            }),
            emergencyContact: joi_1.default.string()
                .max(100)
                .optional()
                .messages({
                'string.max': 'Emergency contact name cannot exceed 100 characters'
            }),
            emergencyPhone: joi_1.default.string()
                .pattern(/^[\+]?[1-9][\d]{0,15}$/)
                .optional()
                .messages({
                'string.pattern.base': 'Please provide a valid emergency contact phone number'
            })
        }),
        update: joi_1.default.object({
            name: joi_1.default.string()
                .min(2)
                .max(50)
                .optional()
                .pattern(/^[a-zA-Z\s]+$/)
                .messages({
                'string.min': 'Name must be at least 2 characters long',
                'string.max': 'Name cannot exceed 50 characters',
                'string.pattern.base': 'Name can only contain letters and spaces'
            }),
            email: joi_1.default.string()
                .email()
                .optional()
                .messages({
                'string.email': 'Please provide a valid email address'
            }),
            phone: joi_1.default.string()
                .pattern(/^[\+]?[1-9][\d]{0,15}$/)
                .optional()
                .messages({
                'string.pattern.base': 'Please provide a valid phone number'
            }),
            department: joi_1.default.string()
                .max(100)
                .optional()
                .messages({
                'string.max': 'Department name cannot exceed 100 characters'
            }),
            bio: joi_1.default.string()
                .max(500)
                .optional()
                .messages({
                'string.max': 'Bio cannot exceed 500 characters'
            }),
            address: joi_1.default.string()
                .max(200)
                .optional()
                .messages({
                'string.max': 'Address cannot exceed 200 characters'
            }),
            emergencyContact: joi_1.default.string()
                .max(100)
                .optional()
                .messages({
                'string.max': 'Emergency contact name cannot exceed 100 characters'
            }),
            emergencyPhone: joi_1.default.string()
                .pattern(/^[\+]?[1-9][\d]{0,15}$/)
                .optional()
                .messages({
                'string.pattern.base': 'Please provide a valid emergency contact phone number'
            }),
            isActive: joi_1.default.boolean()
                .optional()
                .messages({
                'boolean.base': 'isActive must be a boolean value'
            })
        })
    },
    leaveRequest: {
        create: joi_1.default.object({
            leaveType: joi_1.default.string()
                .valid('annual', 'sick', 'casual', 'emergency', 'maternity', 'paternity')
                .required()
                .messages({
                'any.only': 'Leave type must be one of: annual, sick, casual, emergency, maternity, paternity',
                'any.required': 'Leave type is required'
            }),
            startDate: joi_1.default.date()
                .iso()
                .min('now')
                .required()
                .messages({
                'date.base': 'Start date must be a valid date',
                'date.min': 'Start date cannot be in the past',
                'any.required': 'Start date is required'
            }),
            endDate: joi_1.default.date()
                .iso()
                .min(joi_1.default.ref('startDate'))
                .required()
                .messages({
                'date.base': 'End date must be a valid date',
                'date.min': 'End date cannot be before start date',
                'any.required': 'End date is required'
            }),
            reason: joi_1.default.string()
                .min(10)
                .max(500)
                .required()
                .messages({
                'string.min': 'Reason must be at least 10 characters long',
                'string.max': 'Reason cannot exceed 500 characters',
                'any.required': 'Reason is required'
            }),
            isHalfDay: joi_1.default.boolean()
                .default(false)
                .messages({
                'boolean.base': 'isHalfDay must be a boolean value'
            }),
            halfDayPeriod: joi_1.default.string()
                .valid('morning', 'afternoon')
                .when('isHalfDay', {
                is: true,
                then: joi_1.default.required(),
                otherwise: joi_1.default.optional()
            })
                .messages({
                'any.only': 'Half day period must be morning or afternoon',
                'any.required': 'Half day period is required when half day is selected'
            }),
            emergencyContact: joi_1.default.string()
                .max(100)
                .optional()
                .messages({
                'string.max': 'Emergency contact cannot exceed 100 characters'
            }),
            workHandover: joi_1.default.string()
                .max(1000)
                .optional()
                .messages({
                'string.max': 'Work handover notes cannot exceed 1000 characters'
            })
        }),
        update: joi_1.default.object({
            startDate: joi_1.default.date()
                .iso()
                .min('now')
                .optional()
                .messages({
                'date.base': 'Start date must be a valid date',
                'date.min': 'Start date cannot be in the past'
            }),
            endDate: joi_1.default.date()
                .iso()
                .min(joi_1.default.ref('startDate'))
                .optional()
                .messages({
                'date.base': 'End date must be a valid date',
                'date.min': 'End date cannot be before start date'
            }),
            reason: joi_1.default.string()
                .min(10)
                .max(500)
                .optional()
                .messages({
                'string.min': 'Reason must be at least 10 characters long',
                'string.max': 'Reason cannot exceed 500 characters'
            }),
            isHalfDay: joi_1.default.boolean()
                .optional()
                .messages({
                'boolean.base': 'isHalfDay must be a boolean value'
            }),
            halfDayPeriod: joi_1.default.string()
                .valid('morning', 'afternoon')
                .optional()
                .messages({
                'any.only': 'Half day period must be morning or afternoon'
            }),
            emergencyContact: joi_1.default.string()
                .max(100)
                .optional()
                .messages({
                'string.max': 'Emergency contact cannot exceed 100 characters'
            }),
            workHandover: joi_1.default.string()
                .max(1000)
                .optional()
                .messages({
                'string.max': 'Work handover notes cannot exceed 1000 characters'
            })
        })
    },
    leavePolicy: {
        create: joi_1.default.object({
            leaveType: joi_1.default.string()
                .valid('annual', 'sick', 'casual', 'emergency', 'maternity', 'paternity')
                .required()
                .messages({
                'any.only': 'Leave type must be one of: annual, sick, casual, emergency, maternity, paternity',
                'any.required': 'Leave type is required'
            }),
            totalDaysPerYear: joi_1.default.number()
                .integer()
                .min(0)
                .max(365)
                .required()
                .messages({
                'number.base': 'Total days per year must be a number',
                'number.integer': 'Total days per year must be an integer',
                'number.min': 'Total days per year cannot be negative',
                'number.max': 'Total days per year cannot exceed 365',
                'any.required': 'Total days per year is required'
            }),
            canCarryForward: joi_1.default.boolean()
                .default(false)
                .messages({
                'boolean.base': 'Can carry forward must be a boolean value'
            }),
            maxCarryForwardDays: joi_1.default.number()
                .integer()
                .min(0)
                .max(30)
                .when('canCarryForward', {
                is: true,
                then: joi_1.default.required(),
                otherwise: joi_1.default.optional()
            })
                .messages({
                'number.base': 'Max carry forward days must be a number',
                'number.integer': 'Max carry forward days must be an integer',
                'number.min': 'Max carry forward days cannot be negative',
                'number.max': 'Max carry forward days cannot exceed 30',
                'any.required': 'Max carry forward days is required when carry forward is enabled'
            }),
            requiresApproval: joi_1.default.boolean()
                .default(true)
                .messages({
                'boolean.base': 'Requires approval must be a boolean value'
            }),
            allowHalfDay: joi_1.default.boolean()
                .default(true)
                .messages({
                'boolean.base': 'Allow half day must be a boolean value'
            }),
            description: joi_1.default.string()
                .max(500)
                .optional()
                .messages({
                'string.max': 'Description cannot exceed 500 characters'
            })
        }),
        update: joi_1.default.object({
            totalDaysPerYear: joi_1.default.number()
                .integer()
                .min(0)
                .max(365)
                .optional()
                .messages({
                'number.base': 'Total days per year must be a number',
                'number.integer': 'Total days per year must be an integer',
                'number.min': 'Total days per year cannot be negative',
                'number.max': 'Total days per year cannot exceed 365'
            }),
            canCarryForward: joi_1.default.boolean()
                .optional()
                .messages({
                'boolean.base': 'Can carry forward must be a boolean value'
            }),
            maxCarryForwardDays: joi_1.default.number()
                .integer()
                .min(0)
                .max(30)
                .optional()
                .messages({
                'number.base': 'Max carry forward days must be a number',
                'number.integer': 'Max carry forward days must be an integer',
                'number.min': 'Max carry forward days cannot be negative',
                'number.max': 'Max carry forward days cannot exceed 30'
            }),
            requiresApproval: joi_1.default.boolean()
                .optional()
                .messages({
                'boolean.base': 'Requires approval must be a boolean value'
            }),
            allowHalfDay: joi_1.default.boolean()
                .optional()
                .messages({
                'boolean.base': 'Allow half day must be a boolean value'
            }),
            description: joi_1.default.string()
                .max(500)
                .optional()
                .messages({
                'string.max': 'Description cannot exceed 500 characters'
            }),
            isActive: joi_1.default.boolean()
                .optional()
                .messages({
                'boolean.base': 'Is active must be a boolean value'
            })
        })
    },
    holiday: {
        create: joi_1.default.object({
            name: joi_1.default.string()
                .min(1)
                .max(100)
                .required()
                .messages({
                'string.min': 'Holiday name is required',
                'string.max': 'Holiday name cannot exceed 100 characters',
                'any.required': 'Holiday name is required'
            }),
            date: joi_1.default.date()
                .iso()
                .required()
                .messages({
                'date.base': 'Holiday date must be a valid date',
                'any.required': 'Holiday date is required'
            }),
            type: joi_1.default.string()
                .valid('public', 'company', 'religious', 'national')
                .required()
                .messages({
                'any.only': 'Holiday type must be one of: public, company, religious, national',
                'any.required': 'Holiday type is required'
            }),
            description: joi_1.default.string()
                .max(500)
                .optional()
                .messages({
                'string.max': 'Description cannot exceed 500 characters'
            }),
            isRecurring: joi_1.default.boolean()
                .default(false)
                .messages({
                'boolean.base': 'Is recurring must be a boolean value'
            }),
            isActive: joi_1.default.boolean()
                .default(true)
                .messages({
                'boolean.base': 'Is active must be a boolean value'
            })
        }),
        update: joi_1.default.object({
            name: joi_1.default.string()
                .min(1)
                .max(100)
                .optional()
                .messages({
                'string.min': 'Holiday name is required',
                'string.max': 'Holiday name cannot exceed 100 characters'
            }),
            date: joi_1.default.date()
                .iso()
                .optional()
                .messages({
                'date.base': 'Holiday date must be a valid date'
            }),
            type: joi_1.default.string()
                .valid('public', 'company', 'religious', 'national')
                .optional()
                .messages({
                'any.only': 'Holiday type must be one of: public, company, religious, national'
            }),
            description: joi_1.default.string()
                .max(500)
                .optional()
                .messages({
                'string.max': 'Description cannot exceed 500 characters'
            }),
            isRecurring: joi_1.default.boolean()
                .optional()
                .messages({
                'boolean.base': 'Is recurring must be a boolean value'
            }),
            isActive: joi_1.default.boolean()
                .optional()
                .messages({
                'boolean.base': 'Is active must be a boolean value'
            })
        })
    }
};
exports.default = DataValidationService;
//# sourceMappingURL=dataValidationService.js.map