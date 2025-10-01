import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@company.com',
      passwordHash: hashedPassword,
      role: UserRole.admin,
      department: 'HR',
      isActive: true
    }
  });

  // Create manager user
  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      name: 'John Manager',
      email: 'manager@company.com',
      passwordHash: hashedPassword,
      role: UserRole.manager,
      department: 'Engineering',
      isActive: true
    }
  });

  // Create employee user
  const employee = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: {
      name: 'Jane Employee',
      email: 'employee@company.com',
      passwordHash: hashedPassword,
      role: UserRole.employee,
      department: 'Engineering',
      managerId: manager.id,
      isActive: true
    }
  });

  // Create leave policies
  const leavePolicies = [
    {
      leaveType: 'annual',
      totalDaysPerYear: 25,
      canCarryForward: true,
      maxCarryForwardDays: 5,
      requiresApproval: true,
      allowHalfDay: true,
      description: 'Annual leave for vacation and personal time'
    },
    {
      leaveType: 'sick',
      totalDaysPerYear: 10,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      requiresApproval: true,
      allowHalfDay: true,
      description: 'Sick leave for medical reasons'
    },
    {
      leaveType: 'casual',
      totalDaysPerYear: 8,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      requiresApproval: true,
      allowHalfDay: true,
      description: 'Casual leave for personal work'
    },
    {
      leaveType: 'maternity',
      totalDaysPerYear: 90,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      requiresApproval: true,
      allowHalfDay: false,
      description: 'Maternity leave for new mothers'
    },
    {
      leaveType: 'paternity',
      totalDaysPerYear: 15,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      requiresApproval: true,
      allowHalfDay: false,
      description: 'Paternity leave for new fathers'
    },
    {
      leaveType: 'emergency',
      totalDaysPerYear: 5,
      canCarryForward: false,
      maxCarryForwardDays: 0,
      requiresApproval: true,
      allowHalfDay: true,
      description: 'Emergency leave for urgent situations'
    }
  ];

  for (const policy of leavePolicies) {
    await prisma.leavePolicy.upsert({
      where: { leaveType: policy.leaveType },
      update: policy,
      create: policy
    });
  }

  // Create leave balances for current year
  const currentYear = new Date().getFullYear();
  const users = [admin, manager, employee];

  for (const user of users) {
    await prisma.leaveBalance.upsert({
      where: {
        userId_year: {
          userId: user.id,
          year: currentYear
        }
      },
      update: {},
      create: {
        userId: user.id,
        year: currentYear,
        annualTotal: 25,
        annualUsed: 0,
        annualRemaining: 25,
        sickTotal: 10,
        sickUsed: 0,
        sickRemaining: 10,
        casualTotal: 8,
        casualUsed: 0,
        casualRemaining: 8
      }
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('👤 Created users:');
  console.log(`   Admin: ${admin.email} (password: password123)`);
  console.log(`   Manager: ${manager.email} (password: password123)`);
  console.log(`   Employee: ${employee.email} (password: password123)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
