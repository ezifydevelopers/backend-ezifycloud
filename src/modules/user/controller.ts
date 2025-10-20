import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { ApiResponse } from '../../types';
import { createUserSchema, updateUserSchema, toggleUserStatusSchema } from './schema';

// Get all users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const response: ApiResponse<any[]> = {
      success: true,
      message: 'Users retrieved successfully',
      data: users
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 getUserById: Fetching user with ID: ${id}`);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log(`❌ getUserById: User not found with ID: ${id}`);
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: `No user found with ID: ${id}`
      });
      return;
    }

    console.log(`✅ getUserById: User found: ${user.name} (${user.email})`);

    const response: ApiResponse<any> = {
      success: true,
      message: 'User retrieved successfully',
      data: user
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ getUserById: Error fetching user:', error);
    next(error);
  }
};

// Create new user
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }

    const { name, email, password, role, department, manager_id, isActive } = value;

    // Check if user already exists
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

    // Auto-assign manager if not provided and role is employee
    let assignedManagerId = manager_id;
    if (!assignedManagerId && role === 'employee' && department) {
      const departmentManager = await prisma.user.findFirst({
        where: {
          role: 'manager',
          department: department,
          isActive: true
        },
        select: { id: true, name: true }
      });
      assignedManagerId = departmentManager?.id || undefined;
      
      if (departmentManager) {
        console.log(`✅ Auto-assigned manager ${departmentManager.name} to new employee in ${department} department`);
      } else {
        console.log(`⚠️ No manager found in ${department} department for new employee`);
      }
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        department,
        managerId: assignedManagerId,
        isActive: isActive ?? true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const response: ApiResponse<any> = {
      success: true,
      message: 'User created successfully',
      data: newUser
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// Update user
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if email is being changed and if it already exists
    if (value.email && value.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: value.email }
      });

      if (emailExists) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...value,
        managerId: value.manager_id,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const response: ApiResponse<any> = {
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Toggle user status
export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = toggleUserStatusSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: value.isActive,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const response: ApiResponse<any> = {
      success: true,
      message: `User ${value.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedUser
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
