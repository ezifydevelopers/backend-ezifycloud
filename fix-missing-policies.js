const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixMissingPolicies() {
  try {
    console.log('🔧 Fixing missing leave policies...');
    
    // Get admin user to use as creator
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });
    
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log(`👤 Using admin: ${admin.name} (${admin.email})`);
    
    // Create missing leave policies
    const missingPolicies = [
      {
        leaveType: 'annual',
        totalDaysPerYear: 25,
        canCarryForward: true,
        maxCarryForwardDays: 5,
        requiresApproval: true,
        allowHalfDay: true,
        description: 'Annual leave for vacation and personal time',
        createdBy: admin.id,
        isActive: true
      },
      {
        leaveType: 'paternity',
        totalDaysPerYear: 15,
        canCarryForward: false,
        maxCarryForwardDays: 0,
        requiresApproval: true,
        allowHalfDay: false,
        description: 'Paternity leave for new fathers',
        createdBy: admin.id,
        isActive: true
      }
    ];
    
    for (const policy of missingPolicies) {
      const existingPolicy = await prisma.leavePolicy.findUnique({
        where: { leaveType: policy.leaveType }
      });
      
      if (existingPolicy) {
        console.log(`⚠️  Policy ${policy.leaveType} already exists, updating...`);
        await prisma.leavePolicy.update({
          where: { leaveType: policy.leaveType },
          data: {
            ...policy,
            isActive: true
          }
        });
      } else {
        console.log(`➕ Creating policy ${policy.leaveType}...`);
        await prisma.leavePolicy.create({
          data: policy
        });
      }
    }
    
    console.log('✅ Missing leave policies created/updated successfully!');
    
    // Verify the policies were created
    const allPolicies = await prisma.leavePolicy.findMany({
      where: { isActive: true },
      select: {
        leaveType: true,
        totalDaysPerYear: true,
        isActive: true
      }
    });
    
    console.log('\n📋 All Active Leave Policies:');
    allPolicies.forEach(policy => {
      console.log(`  - ${policy.leaveType}: ${policy.totalDaysPerYear} days`);
    });
    
    // Now update the user's leave balance to include the new policies
    const user = await prisma.user.findUnique({
      where: { email: 'bilal@ezify.com' }
    });
    
    if (user) {
      const currentYear = new Date().getFullYear();
      
      // Get user's approved leave requests
      const approvedRequests = await prisma.leaveRequest.findMany({
        where: {
          userId: user.id,
          status: 'approved',
          submittedAt: {
            gte: new Date(currentYear, 0, 1),
            lte: new Date(currentYear, 11, 31)
          }
        },
        select: {
          leaveType: true,
          totalDays: true
        }
      });
      
      // Calculate used days by leave type
      const usedByType = {};
      approvedRequests.forEach(request => {
        const days = Number(request.totalDays);
        usedByType[request.leaveType] = (usedByType[request.leaveType] || 0) + days;
      });
      
      console.log(`\n👤 Updating leave balance for ${user.name}:`);
      console.log('  Used days by type:', usedByType);
      
      // Update or create leave balance
      await prisma.leaveBalance.upsert({
        where: {
          userId_year: {
            userId: user.id,
            year: currentYear
          }
        },
        update: {
          annualTotal: 25,
          annualUsed: usedByType.annual || 0,
          annualRemaining: Math.max(0, 25 - (usedByType.annual || 0)),
          paternityTotal: 15,
          paternityUsed: usedByType.paternity || 0,
          paternityRemaining: Math.max(0, 15 - (usedByType.paternity || 0))
        },
        create: {
          userId: user.id,
          year: currentYear,
          annualTotal: 25,
          annualUsed: usedByType.annual || 0,
          annualRemaining: Math.max(0, 25 - (usedByType.annual || 0)),
          sickTotal: 10,
          sickUsed: usedByType.sick || 0,
          sickRemaining: Math.max(0, 10 - (usedByType.sick || 0)),
          casualTotal: 8,
          casualUsed: usedByType.casual || 0,
          casualRemaining: Math.max(0, 8 - (usedByType.casual || 0)),
          paternityTotal: 15,
          paternityUsed: usedByType.paternity || 0,
          paternityRemaining: Math.max(0, 15 - (usedByType.paternity || 0))
        }
      });
      
      console.log('✅ Leave balance updated successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing missing policies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingPolicies();
