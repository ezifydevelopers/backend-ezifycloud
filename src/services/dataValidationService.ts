import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  expectedValue?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export class DataValidationService {
  /**
   * Comprehensive validation schemas
   */
  static readonly schemas = {
    // User validation schemas
    user: {
      create: Joi.object({
        name: Joi.string()
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
        email: Joi.string()
          .email()
          .required()
          .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
          }),
        password: Joi.string()
          .min(8)
          .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
          .required()
          .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
            'any.required': 'Password is required'
          }),
        role: Joi.string()
          .valid('admin', 'manager', 'employee')
          .required()
          .messages({
            'any.only': 'Role must be admin, manager, or employee',
            'any.required': 'Role is required'
          }),
        department: Joi.string()
          .max(100)
          .optional()
          .messages({
            'string.max': 'Department name cannot exceed 100 characters'
          }),
        managerId: Joi.string()
          .uuid()
          .allow(null)
          .optional()
          .messages({
            'string.guid': 'Manager ID must be a valid UUID'
          }),
        phone: Joi.string()
          .pattern(/^[\+]?[1-9][\d]{0,15}$/)
          .optional()
          .messages({
            'string.pattern.base': 'Please provide a valid phone number'
          }),
        bio: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Bio cannot exceed 500 characters'
          }),
        address: Joi.string()
          .max(200)
          .optional()
          .messages({
            'string.max': 'Address cannot exceed 200 characters'
          }),
        emergencyContact: Joi.string()
          .max(100)
          .optional()
          .messages({
            'string.max': 'Emergency contact name cannot exceed 100 characters'
          }),
        emergencyPhone: Joi.string()
          .pattern(/^[\+]?[1-9][\d]{0,15}$/)
          .optional()
          .messages({
            'string.pattern.base': 'Please provide a valid emergency contact phone number'
          })
      }),

      update: Joi.object({
        name: Joi.string()
          .min(2)
          .max(50)
          .optional()
          .pattern(/^[a-zA-Z\s]+$/)
          .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 50 characters',
            'string.pattern.base': 'Name can only contain letters and spaces'
          }),
        email: Joi.string()
          .email()
          .optional()
          .messages({
            'string.email': 'Please provide a valid email address'
          }),
        phone: Joi.string()
          .pattern(/^[\+]?[1-9][\d]{0,15}$/)
          .optional()
          .messages({
            'string.pattern.base': 'Please provide a valid phone number'
          }),
        department: Joi.string()
          .max(100)
          .optional()
          .messages({
            'string.max': 'Department name cannot exceed 100 characters'
          }),
        bio: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Bio cannot exceed 500 characters'
          }),
        address: Joi.string()
          .max(200)
          .optional()
          .messages({
            'string.max': 'Address cannot exceed 200 characters'
          }),
        emergencyContact: Joi.string()
          .max(100)
          .optional()
          .messages({
            'string.max': 'Emergency contact name cannot exceed 100 characters'
          }),
        emergencyPhone: Joi.string()
          .pattern(/^[\+]?[1-9][\d]{0,15}$/)
          .optional()
          .messages({
            'string.pattern.base': 'Please provide a valid emergency contact phone number'
          }),
        isActive: Joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'isActive must be a boolean value'
          })
      })
    },

    // Leave request validation schemas
    leaveRequest: {
      create: Joi.object({
        leaveType: Joi.string()
          .min(1)
          .required()
          .messages({
            'string.empty': 'Leave type is required',
            'any.required': 'Leave type is required'
          }),
        startDate: Joi.date()
          .iso()
          .min('now')
          .required()
          .messages({
            'date.base': 'Start date must be a valid date',
            'date.min': 'Start date cannot be in the past',
            'any.required': 'Start date is required'
          }),
        endDate: Joi.date()
          .iso()
          .min(Joi.ref('startDate'))
          .required()
          .messages({
            'date.base': 'End date must be a valid date',
            'date.min': 'End date cannot be before start date',
            'any.required': 'End date is required'
          }),
        reason: Joi.string()
          .min(10)
          .max(500)
          .required()
          .messages({
            'string.min': 'Reason must be at least 10 characters long',
            'string.max': 'Reason cannot exceed 500 characters',
            'any.required': 'Reason is required'
          }),
        isHalfDay: Joi.boolean()
          .default(false)
          .messages({
            'boolean.base': 'isHalfDay must be a boolean value'
          }),
        halfDayPeriod: Joi.string()
          .valid('morning', 'afternoon')
          .when('isHalfDay', {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional()
          })
          .messages({
            'any.only': 'Half day period must be morning or afternoon',
            'any.required': 'Half day period is required when half day is selected'
          }),
        emergencyContact: Joi.string()
          .max(100)
          .optional()
          .messages({
            'string.max': 'Emergency contact cannot exceed 100 characters'
          }),
        workHandover: Joi.string()
          .max(1000)
          .optional()
          .messages({
            'string.max': 'Work handover notes cannot exceed 1000 characters'
          })
      }),

      update: Joi.object({
        startDate: Joi.date()
          .iso()
          .min('now')
          .optional()
          .messages({
            'date.base': 'Start date must be a valid date',
            'date.min': 'Start date cannot be in the past'
          }),
        endDate: Joi.date()
          .iso()
          .min(Joi.ref('startDate'))
          .optional()
          .messages({
            'date.base': 'End date must be a valid date',
            'date.min': 'End date cannot be before start date'
          }),
        reason: Joi.string()
          .min(10)
          .max(500)
          .optional()
          .messages({
            'string.min': 'Reason must be at least 10 characters long',
            'string.max': 'Reason cannot exceed 500 characters'
          }),
        isHalfDay: Joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'isHalfDay must be a boolean value'
          }),
        halfDayPeriod: Joi.string()
          .valid('morning', 'afternoon')
          .optional()
          .messages({
            'any.only': 'Half day period must be morning or afternoon'
          }),
        emergencyContact: Joi.string()
          .max(100)
          .optional()
          .messages({
            'string.max': 'Emergency contact cannot exceed 100 characters'
          }),
        workHandover: Joi.string()
          .max(1000)
          .optional()
          .messages({
            'string.max': 'Work handover notes cannot exceed 1000 characters'
          })
      })
    },

    // Leave policy validation schemas
    leavePolicy: {
      create: Joi.object({
        leaveType: Joi.string()
          .valid('annual', 'sick', 'casual', 'emergency', 'maternity', 'paternity')
          .required()
          .messages({
            'any.only': 'Leave type must be one of: annual, sick, casual, emergency, maternity, paternity',
            'any.required': 'Leave type is required'
          }),
        totalDaysPerYear: Joi.number()
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
        canCarryForward: Joi.boolean()
          .default(false)
          .messages({
            'boolean.base': 'Can carry forward must be a boolean value'
          }),
        maxCarryForwardDays: Joi.number()
          .integer()
          .min(0)
          .max(30)
          .when('canCarryForward', {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional()
          })
          .messages({
            'number.base': 'Max carry forward days must be a number',
            'number.integer': 'Max carry forward days must be an integer',
            'number.min': 'Max carry forward days cannot be negative',
            'number.max': 'Max carry forward days cannot exceed 30',
            'any.required': 'Max carry forward days is required when carry forward is enabled'
          }),
        requiresApproval: Joi.boolean()
          .default(true)
          .messages({
            'boolean.base': 'Requires approval must be a boolean value'
          }),
        allowHalfDay: Joi.boolean()
          .default(true)
          .messages({
            'boolean.base': 'Allow half day must be a boolean value'
          }),
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Description cannot exceed 500 characters'
          })
      }),

      update: Joi.object({
        totalDaysPerYear: Joi.number()
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
        canCarryForward: Joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Can carry forward must be a boolean value'
          }),
        maxCarryForwardDays: Joi.number()
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
        requiresApproval: Joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Requires approval must be a boolean value'
          }),
        allowHalfDay: Joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Allow half day must be a boolean value'
          }),
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Description cannot exceed 500 characters'
          }),
        isActive: Joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Is active must be a boolean value'
          })
      })
    },

    // Holiday validation schemas
    holiday: {
      create: Joi.object({
        name: Joi.string()
          .min(1)
          .max(100)
          .required()
          .messages({
            'string.min': 'Holiday name is required',
            'string.max': 'Holiday name cannot exceed 100 characters',
            'any.required': 'Holiday name is required'
          }),
        date: Joi.date()
          .iso()
          .required()
          .messages({
            'date.base': 'Holiday date must be a valid date',
            'any.required': 'Holiday date is required'
          }),
        type: Joi.string()
          .valid('public', 'company', 'religious', 'national')
          .required()
          .messages({
            'any.only': 'Holiday type must be one of: public, company, religious, national',
            'any.required': 'Holiday type is required'
          }),
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Description cannot exceed 500 characters'
          }),
        isRecurring: Joi.boolean()
          .default(false)
          .messages({
            'boolean.base': 'Is recurring must be a boolean value'
          }),
        isActive: Joi.boolean()
          .default(true)
          .messages({
            'boolean.base': 'Is active must be a boolean value'
          })
      }),

      update: Joi.object({
        name: Joi.string()
          .min(1)
          .max(100)
          .optional()
          .messages({
            'string.min': 'Holiday name is required',
            'string.max': 'Holiday name cannot exceed 100 characters'
          }),
        date: Joi.date()
          .iso()
          .optional()
          .messages({
            'date.base': 'Holiday date must be a valid date'
          }),
        type: Joi.string()
          .valid('public', 'company', 'religious', 'national')
          .optional()
          .messages({
            'any.only': 'Holiday type must be one of: public, company, religious, national'
          }),
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Description cannot exceed 500 characters'
          }),
        isRecurring: Joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Is recurring must be a boolean value'
          }),
        isActive: Joi.boolean()
          .optional()
          .messages({
            'boolean.base': 'Is active must be a boolean value'
          })
      })
    }
  };

  /**
   * Validate data against schema
   */
  static validateData<T>(schema: Joi.ObjectSchema, data: T): ValidationResult {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    const result: ValidationResult = {
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

  /**
   * Validate user data
   */
  static validateUser(data: any, isUpdate: boolean = false): ValidationResult {
    const schema = isUpdate ? this.schemas.user.update : this.schemas.user.create;
    return this.validateData(schema, data);
  }

  /**
   * Validate leave request data
   */
  static validateLeaveRequest(data: any, isUpdate: boolean = false): ValidationResult {
    const schema = isUpdate ? this.schemas.leaveRequest.update : this.schemas.leaveRequest.create;
    return this.validateData(schema, data);
  }

  /**
   * Validate leave policy data
   */
  static validateLeavePolicy(data: any, isUpdate: boolean = false): ValidationResult {
    const schema = isUpdate ? this.schemas.leavePolicy.update : this.schemas.leavePolicy.create;
    return this.validateData(schema, data);
  }

  /**
   * Validate holiday data
   */
  static validateHoliday(data: any, isUpdate: boolean = false): ValidationResult {
    const schema = isUpdate ? this.schemas.holiday.update : this.schemas.holiday.create;
    return this.validateData(schema, data);
  }

  /**
   * Validate email uniqueness
   */
  static async validateEmailUniqueness(email: string, excludeUserId?: string): Promise<ValidationResult> {
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
    } catch (error) {
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

  /**
   * Validate manager assignment
   */
  static async validateManagerAssignment(managerId: string): Promise<ValidationResult> {
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

      const warnings: ValidationWarning[] = [];
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
    } catch (error) {
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

  /**
   * Validate leave policy uniqueness
   */
  static async validateLeavePolicyUniqueness(leaveType: string, employeeType: string | null, excludePolicyId?: string): Promise<ValidationResult> {
    try {
      // Check if a policy with the same leaveType and employeeType already exists
      const existingPolicy = await prisma.leavePolicy.findFirst({
        where: {
          leaveType,
          employeeType: employeeType || null
        }
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
    } catch (error) {
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

  /**
   * Validate holiday date conflicts
   */
  static async validateHolidayDateConflicts(date: Date, excludeHolidayId?: string): Promise<ValidationResult> {
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
    } catch (error) {
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

  /**
   * Comprehensive validation middleware
   */
  static createValidationMiddleware(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      const result = this.validateData(schema, req.body);

      if (!result.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'Invalid request data',
          details: result.errors
        });
      }

      // Replace req.body with validated and sanitized data
      req.body = schema.validate(req.body, { stripUnknown: true }).value;
      return next();
    };
  }
}

export default DataValidationService;
