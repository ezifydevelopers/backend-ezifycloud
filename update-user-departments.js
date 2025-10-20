const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserDepartments() {
  try {
    console.log('🔍 Updating user departments to Digital Marketing...');
    
    // Update all users to have Digital Marketing department
    const result = await prisma.user.updateMany({
      where: {
        department: {
          not: null
        }
      },
      data: {
        department: 'Digital Marketing'
      }
    });
    
    console.log(`✅ Updated ${result.count} users to Digital Marketing department`);
    
    // Verify the update
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true
      }
    });
    
    console.log('\n📊 Updated user departments:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}): ${user.department || 'NULL'} [${user.role}]`);
    });
    
  } catch (error) {
    console.error('❌ Error updating user departments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserDepartments();
