import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Middleware to validate request data against Joi schema
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log the incoming request body for debugging
    console.log('🔍 Validation: Incoming request body:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
      convert: true, // Automatically convert types
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.error('❌ Validation failed:', errorDetails);

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'Invalid request data',
        details: errorDetails
      });
    }

    console.log('✅ Validation passed. Sanitized body:', JSON.stringify(value, null, 2));

    // Replace req.body with validated and sanitized data
    req.body = value;
    return next();
  };
};

/**
 * Middleware to validate query parameters against Joi schema
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        error: 'Invalid query parameters',
        details: errorDetails
      });
    }

    // Replace req.query with validated and sanitized data
    req.query = value;
    return next();
  };
};

/**
 * Middleware to validate route parameters against Joi schema
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Parameter validation failed',
        error: 'Invalid route parameters',
        details: errorDetails
      });
    }

    // Replace req.params with validated and sanitized data
    req.params = value;
    return next();
  };
};

/**
 * Generic validation middleware that can validate body, query, or params
 */
export const validate = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = [];

    // Validate body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          type: 'body',
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })));
      } else {
        req.body = value;
      }
    }

    // Validate query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          type: 'query',
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })));
      } else {
        req.query = value;
      }
    }

    // Validate params
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          type: 'params',
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })));
      } else {
        req.params = value;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'Invalid request data',
        details: errors
      });
    }

    return next();
  };
};

/**
 * Custom validation for specific use cases
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateDateRange = (startDate: string, endDate: string): { isValid: boolean; error?: string } => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { isValid: false, error: 'Invalid start date format' };
  }

  if (isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid end date format' };
  }

  if (start >= end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }

  return { isValid: true };
};
