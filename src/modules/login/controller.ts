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
        approvalStatus: true,
        approvedBy: true,
        approvedAt: true,
        rejectionReason: true,
        name: true,
        role: true,
        department: true,
        managerId: true,
        profilePicture: true,
        passwordHash: true,
        isActive: true,
        employeeType: true,
        region: true,
        timezone: true,
        employeeId: true,
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

    // Check if user is approved (unless admin - admins are auto-approved)
    // For backward compatibility: Auto-approve existing users who:
    // 1. Don't have approvalStatus set (null/undefined)
    // 2. Have 'pending' status but were created before the approval system (created more than 7 days ago)
    // This allows existing employees to continue logging in
    const isExistingUser = user.createdAt && new Date(user.createdAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (user.approvalStatus === 'pending' && user.role !== 'admin') {
      // Auto-approve existing users (created more than 7 days ago) for backward compatibility
      if (isExistingUser) {
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            approvalStatus: 'approved',
            approvedAt: new Date()
          }
        });
        user.approvalStatus = 'approved';
      } else {
        // New users with pending status need admin approval
        res.status(403).json({
          success: false,
          message: 'Your account is pending approval. Please wait for an administrator to approve your access.',
          requiresApproval: true,
          approvalStatus: 'pending'
        });
        return;
      }
    }

    if (user.approvalStatus === 'rejected') {
      res.status(403).json({
        success: false,
        message: 'Your account access has been rejected. Please contact an administrator for more information.',
        requiresApproval: true,
        approvalStatus: 'rejected'
      });
      return;
    }

    // Auto-approve existing users who don't have approvalStatus set (backward compatibility)
    if (!user.approvalStatus && user.role !== 'admin') {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          approvalStatus: 'approved',
          approvedAt: new Date()
        }
      });
      // Update the user object for response
      user.approvalStatus = 'approved';
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
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorMessage
    });
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

    const { name, email, password, role, department, manager_id, employeeType, region, timezone, employeeId } = value;

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

    // Check if employeeId already exists (if provided)
    if (employeeId) {
      const existingEmployeeId = await prisma.user.findUnique({
        where: { employeeId }
      });

      if (existingEmployeeId) {
        res.status(409).json({
          success: false,
          message: 'Employee ID already exists. Please use a different Employee ID.'
        });
        return;
      }
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
    // Set approvalStatus to 'pending' - requires admin/manager approval for dashboard access
    // Admins are auto-approved, employees/managers need approval
    const autoApprove = role === 'admin';
    
    // Set up probation for employees (not admins/managers) based on joinDate
    // If joinDate is provided, use it; otherwise use current date
    const joinDate = value.joinDate ? new Date(value.joinDate) : new Date();
    
    // Get default probation duration from SystemConfig
    let defaultProbationDuration = 90; // Default fallback
    try {
      const probationConfig = await prisma.systemConfig.findUnique({
        where: { key: 'defaultProbationDuration' }
      });
      if (probationConfig) {
        defaultProbationDuration = parseInt(probationConfig.value, 10) || 90;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch default probation duration from SystemConfig, using default 90 days');
    }
    
    const shouldStartProbation = role === 'employee';
    const probationStartDate = shouldStartProbation ? joinDate : null;
    const probationEndDate = shouldStartProbation 
      ? new Date(joinDate.getTime() + defaultProbationDuration * 24 * 60 * 60 * 1000)
      : null;
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        employeeId: value.employeeId || null,
        passwordHash,
        role,
        department,
        managerId: assignedManagerId,
        isActive: true,
        approvalStatus: autoApprove ? 'approved' : 'pending',
        joinDate: joinDate,
        probationStatus: shouldStartProbation ? 'active' : null,
        probationStartDate,
        probationEndDate,
        probationDuration: shouldStartProbation ? defaultProbationDuration : null,
        employeeType: employeeType || null,
        region: region || null,
        timezone: timezone || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        employeeId: true,
        role: true,
        department: true,
        managerId: true,
        profilePicture: true,
        isActive: true,
        approvalStatus: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // If user is pending approval, don't return token and show message
    if (newUser.approvalStatus === 'pending') {
      // Notify all admins about the new pending approval request
      try {
        const { NotificationService } = await import('../notification/services/notificationService');
        
        // Get all active admin users
        const adminUsers = await prisma.user.findMany({
          where: {
            role: 'admin',
            isActive: true
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        });

        // Create notification for each admin
        for (const admin of adminUsers) {
          await NotificationService.createNotification({
            userId: admin.id,
            type: 'approval_requested',
            title: 'New Employee Approval Request',
            message: `${newUser.name} (${newUser.email}) has requested access and is waiting for approval.`,
            link: '/admin/user-approvals',
            metadata: {
              userId: newUser.id,
              userName: newUser.name,
              userEmail: newUser.email,
              userRole: newUser.role,
              department: newUser.department,
              requestType: 'user_approval'
            }
          });
        }

        console.log(`✅ Created approval notifications for ${adminUsers.length} admin(s) for new user: ${newUser.email}`);
      } catch (notificationError) {
        // Log error but don't fail the registration
        console.error('⚠️ Error creating admin notifications for pending user:', notificationError);
      }

      const response: ApiResponse<{ user: any; requiresApproval: boolean }> = {
        success: true,
        message: 'Registration successful. Your account is pending approval. You will be notified once an administrator approves your access.',
        data: {
          user: newUser,
          requiresApproval: true
        }
      };
      res.status(201).json(response);
      return;
    }

    // Generate JWT token for approved users
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
