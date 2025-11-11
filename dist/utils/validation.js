"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDateRange = exports.validatePhone = exports.validatePassword = exports.validateEmail = exports.validate = exports.validateParams = exports.validateQuery = exports.validateRequest = void 0;
const validateRequest = (schema) => {
    return (req, res, next) => {
        console.log('🔍 Validation: Incoming request body:', JSON.stringify(req.body, null, 2));
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: true,
            convert: true,
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
        req.body = value;
        return next();
    };
};
exports.validateRequest = validateRequest;
const validateQuery = (schema) => {
    return (req, res, next) => {
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
        req.query = value;
        return next();
    };
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return (req, res, next) => {
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
        req.params = value;
        return next();
    };
};
exports.validateParams = validateParams;
const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];
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
            }
            else {
                req.body = value;
            }
        }
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
            }
            else {
                req.query = value;
            }
        }
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
            }
            else {
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
exports.validate = validate;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    const errors = [];
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
exports.validatePassword = validatePassword;
const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};
exports.validatePhone = validatePhone;
const validateDateRange = (startDate, endDate) => {
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
exports.validateDateRange = validateDateRange;
//# sourceMappingURL=validation.js.map