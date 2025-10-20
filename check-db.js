const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...');
    
    // Check users
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { name: true, email: true, role: true }
      });
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
    }
    
    // Check leave policies
    const policyCount = await prisma.leavePolicy.count();
    console.log(`📋 Leave policies in database: ${policyCount}`);
    
    if (policyCount > 0) {
      const policies = await prisma.leavePolicy.findMany({
        select: { leaveType: true, totalDaysPerYear: true, isActive: true }
      });
      policies.forEach(policy => {
        console.log(`   - ${policy.leaveType}: ${policy.totalDaysPerYear} days (${policy.isActive ? 'Active' : 'Inactive'})`);
      });
    }
    
    // Check leave balances
    const balanceCount = await prisma.leaveBalance.count();
    console.log(`💰 Leave balances in database: ${balanceCount}`);
    
    console.log('✅ Database check completed!');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
