import Joi from 'joi';

// Create user validation schema
export const createUserSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
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
    .min(6)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid('admin', 'manager', 'employee')
    .default('employee')
    .messages({
      'any.only': 'Role must be admin, manager, or employee'
    }),
  department: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Department name cannot exceed 100 characters'
    }),
  manager_id: Joi.string()
    .uuid()
    .allow(null)
    .optional()
    .messages({
      'string.guid': 'Manager ID must be a valid UUID'
    }),
  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
});

// Update user validation schema
export const updateUserSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  role: Joi.string()
    .valid('admin', 'manager', 'employee')
    .optional()
    .messages({
      'any.only': 'Role must be admin, manager, or employee'
    }),
  department: Joi.string()
    .max(100)
    .allow(null)
    .optional()
    .messages({
      'string.max': 'Department name cannot exceed 100 characters'
    }),
  manager_id: Joi.string()
    .uuid()
    .allow(null)
    .optional()
    .messages({
      'string.guid': 'Manager ID must be a valid UUID'
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
});

// Toggle user status schema
export const toggleUserStatusSchema = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
      'any.required': 'isActive is required'
    })
});
