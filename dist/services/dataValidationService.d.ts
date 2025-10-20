import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
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
export declare class DataValidationService {
    static readonly schemas: {
        user: {
            create: Joi.ObjectSchema<any>;
            update: Joi.ObjectSchema<any>;
        };
        leaveRequest: {
            create: Joi.ObjectSchema<any>;
            update: Joi.ObjectSchema<any>;
        };
        leavePolicy: {
            create: Joi.ObjectSchema<any>;
            update: Joi.ObjectSchema<any>;
        };
        holiday: {
            create: Joi.ObjectSchema<any>;
            update: Joi.ObjectSchema<any>;
        };
    };
    static validateData<T>(schema: Joi.ObjectSchema, data: T): ValidationResult;
    static validateUser(data: any, isUpdate?: boolean): ValidationResult;
    static validateLeaveRequest(data: any, isUpdate?: boolean): ValidationResult;
    static validateLeavePolicy(data: any, isUpdate?: boolean): ValidationResult;
    static validateHoliday(data: any, isUpdate?: boolean): ValidationResult;
    static validateEmailUniqueness(email: string, excludeUserId?: string): Promise<ValidationResult>;
    static validateManagerAssignment(managerId: string): Promise<ValidationResult>;
    static validateLeavePolicyUniqueness(leaveType: string, excludePolicyId?: string): Promise<ValidationResult>;
    static validateHolidayDateConflicts(date: Date, excludeHolidayId?: string): Promise<ValidationResult>;
    static createValidationMiddleware(schema: Joi.ObjectSchema): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
}
export default DataValidationService;
//# sourceMappingURL=dataValidationService.d.ts.map