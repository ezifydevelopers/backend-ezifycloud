const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserDepartments() {
  try {
    console.log('🔍 Checking user departments...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true
      }
    });
    
    console.log('📊 User departments:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}): ${user.department || 'NULL'} [${user.role}]`);
    });
    
    const departmentCounts = users.reduce((acc, user) => {
      const dept = user.department || 'NULL';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 Department distribution:');
    Object.entries(departmentCounts).forEach(([dept, count]) => {
      console.log(`  - ${dept}: ${count} users`);
    });
    
  } catch (error) {
    console.error('❌ Error checking user departments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserDepartments();
