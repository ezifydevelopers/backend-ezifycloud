"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleUserStatus = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const schema_1 = require("./schema");
const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma_1.default.user.findMany({
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
        const response = {
            success: true,
            message: 'Users retrieved successfully',
            data: users
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(`🔍 getUserById: Fetching user with ID: ${id}`);
        const user = await prisma_1.default.user.findUnique({
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
        const response = {
            success: true,
            message: 'User retrieved successfully',
            data: user
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('❌ getUserById: Error fetching user:', error);
        next(error);
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res, next) => {
    try {
        const { error, value } = schema_1.createUserSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
            return;
        }
        const { name, email, password, role, department, manager_id, isActive } = value;
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
            return;
        }
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        let assignedManagerId = manager_id;
        if (!assignedManagerId && role === 'employee' && department) {
            const departmentManager = await prisma_1.default.user.findFirst({
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
            }
            else {
                console.log(`⚠️ No manager found in ${department} department for new employee`);
            }
        }
        const newUser = await prisma_1.default.user.create({
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
        const response = {
            success: true,
            message: 'User created successfully',
            data: newUser
        };
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createUser = createUser;
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, value } = schema_1.updateUserSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
            return;
        }
        const existingUser = await prisma_1.default.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        if (value.email && value.email !== existingUser.email) {
            const emailExists = await prisma_1.default.user.findUnique({
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
        const updatedUser = await prisma_1.default.user.update({
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
        const response = {
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existingUser = await prisma_1.default.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        await prisma_1.default.user.delete({
            where: { id }
        });
        const response = {
            success: true,
            message: 'User deleted successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
const toggleUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, value } = schema_1.toggleUserStatusSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
            return;
        }
        const existingUser = await prisma_1.default.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        const updatedUser = await prisma_1.default.user.update({
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
        const response = {
            success: true,
            message: `User ${value.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedUser
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.toggleUserStatus = toggleUserStatus;
//# sourceMappingURL=controller.js.map