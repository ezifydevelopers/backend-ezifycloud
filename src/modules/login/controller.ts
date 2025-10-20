import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { ApiResponse } from '../../types';
import { APP_CONFIG } from '../../config/app';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from './schema';

// Login controller
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }

    const { email, password } = value;

    // Find user by email using Prisma
    const user = await prisma.user.findUnique({
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

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      APP_CONFIG.JWT.SECRET,
      { expiresIn: APP_CONFIG.JWT.EXPIRES_IN } as jwt.SignOptions
    );

    // Remove password from response
    const { passwordHash, ...userWithoutPassword } = user;

    const response: ApiResponse<{ user: any; token: string }> = {
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Register controller
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }

    const { name, email, password, role, department, manager_id } = value;

    // Check if user already exists using Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Use Business Rules Service for auto-manager assignment
    let assignedManagerId = manager_id;
    if (!assignedManagerId && role === 'employee') {
      const BusinessRulesService = (await import('../../services/businessRulesService')).default;
      const assignmentResult = await BusinessRulesService.autoAssignManager({
        role,
        department,
        managerId: manager_id
      });
      
      if (assignmentResult.isValid && assignmentResult.assignedManagerId) {
        assignedManagerId = assignmentResult.assignedManagerId;
        console.log(`✅ Auto-assigned manager: ${assignmentResult.assignmentReason}`);
      } else {
        console.log(`⚠️ Auto-assignment failed: ${assignmentResult.message}`);
        if (assignmentResult.warnings) {
          console.log(`⚠️ Warnings: ${assignmentResult.warnings.join(', ')}`);
        }
      }
    }

    // Create new user using Prisma
    const newUser = await prisma.user.create({
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

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    const response: ApiResponse<{ user: any; token: string }> = {
      success: true,
      message: 'Registration successful',
      data: {
        user: newUser,
        token
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// Forgot password controller
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }

    const { email } = value;

    // Check if user exists using Prisma
    const user = await prisma.user.findFirst({
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
      // Don't reveal if email exists or not for security
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
      return;
    }

    // Generate reset token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const resetToken = jwt.sign(
      { userId: user.id, email },
      jwtSecret,
      { expiresIn: '1h' } as jwt.SignOptions
    );

    // Store reset token in database (you might want to create a separate table for this)
    // For now, we'll just log it (in production, send email)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    const response: ApiResponse = {
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Reset password controller
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }

    const { token, password } = value;

    // Verify reset token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = jwt.verify(token, jwtSecret) as any;
    const { userId } = decoded;

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password using Prisma
    const updateResult = await prisma.user.updateMany({
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

    const response: ApiResponse = {
      success: true,
      message: 'Password reset successful'
    };

    res.status(200).json(response);
  } catch (error) {
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


// Change password controller
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }

    const { currentPassword, newPassword } = value;
    const userId = (req as any).user.id;

    // Get current user using Prisma
    const user = await prisma.user.findUnique({
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

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password using Prisma
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedAt: new Date()
      }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
