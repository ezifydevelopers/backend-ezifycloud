const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLeavePolicies() {
  try {
    console.log('🔍 Checking leave policies...');
    
    // Get all leave policies
    const policies = await prisma.leavePolicy.findMany({
      select: {
        leaveType: true,
        totalDaysPerYear: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log('📋 Leave Policies in Database:');
    policies.forEach(policy => {
      console.log(`  - ${policy.leaveType}: ${policy.totalDaysPerYear} days (Active: ${policy.isActive})`);
    });
    
    // Get active policies only
    const activePolicies = await prisma.leavePolicy.findMany({
      where: { isActive: true },
      select: {
        leaveType: true,
        totalDaysPerYear: true
      }
    });
    
    console.log('\n✅ Active Leave Policies:');
    activePolicies.forEach(policy => {
      console.log(`  - ${policy.leaveType}: ${policy.totalDaysPerYear} days`);
    });
    
    // Check if annual and paternity policies exist
    const annualPolicy = await prisma.leavePolicy.findUnique({
      where: { leaveType: 'annual' }
    });
    
    const paternityPolicy = await prisma.leavePolicy.findUnique({
      where: { leaveType: 'paternity' }
    });
    
    console.log('\n🔍 Specific Policy Check:');
    console.log(`  Annual Policy: ${annualPolicy ? `${annualPolicy.totalDaysPerYear} days (Active: ${annualPolicy.isActive})` : 'NOT FOUND'}`);
    console.log(`  Paternity Policy: ${paternityPolicy ? `${paternityPolicy.totalDaysPerYear} days (Active: ${paternityPolicy.isActive})` : 'NOT FOUND'}`);
    
    // Check leave requests for the user
    const user = await prisma.user.findUnique({
      where: { email: 'bilal@ezify.com' }
    });
    
    if (user) {
      console.log(`\n👤 User: ${user.name} (${user.email})`);
      
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: { userId: user.id },
        select: {
          leaveType: true,
          totalDays: true,
          status: true,
          startDate: true,
          endDate: true
        }
      });
      
      console.log('📝 Leave Requests:');
      leaveRequests.forEach(request => {
        console.log(`  - ${request.leaveType}: ${request.totalDays} days (${request.status}) - ${request.startDate.toISOString().split('T')[0]} to ${request.endDate.toISOString().split('T')[0]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking leave policies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeavePolicies();
