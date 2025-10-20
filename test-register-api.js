const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test data
const testUsers = [
  {
    name: 'Test User 1',
    email: 'testuser1@example.com',
    password: 'Password123',
    role: 'employee',
    department: 'Engineering'
  },
  {
    name: 'Test Manager',
    email: 'testmanager@example.com',
    password: 'Password123',
    role: 'manager',
    department: 'HR'
  },
  {
    name: 'Test Admin',
    email: 'testadmin@example.com',
    password: 'Password123',
    role: 'admin',
    department: 'IT'
  }
];

// Invalid test data
const invalidTestCases = [
  {
    name: 'Invalid Email Test',
    data: {
      name: 'Invalid Email',
      email: 'invalid-email',
      password: 'Password123',
      role: 'employee'
    },
    expectedError: 'Please provide a valid email address'
  },
  {
    name: 'Weak Password Test',
    data: {
      name: 'Weak Password',
      email: 'weak@example.com',
      password: '123456',
      role: 'employee'
    },
    expectedError: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  },
  {
    name: 'Missing Name Test',
    data: {
      email: 'missingname@example.com',
      password: 'Password123',
      role: 'employee'
    },
    expectedError: 'Name is required'
  },
  {
    name: 'Invalid Role Test',
    data: {
      name: 'Invalid Role',
      email: 'invalidrole@example.com',
      password: 'Password123',
      role: 'invalid_role'
    },
    expectedError: 'Role must be admin, manager, or employee'
  }
];

async function testRegisterAPI() {
  console.log('🚀 Starting Register API Tests...\n');

  // Test 1: Health check
  console.log('1. Testing server health...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server is running:', healthData.status);
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.');
    console.log('Run: npm run dev');
    return;
  }

  console.log('\n2. Testing successful registrations...');
  
  // Test successful registrations
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    console.log(`\n   Testing ${user.role} registration...`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user)
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`   ✅ ${user.role} registration successful`);
        console.log(`   📧 Email: ${data.data.user.email}`);
        console.log(`   🆔 User ID: ${data.data.user.id}`);
        console.log(`   🔑 Token generated: ${data.data.token ? 'Yes' : 'No'}`);
      } else {
        console.log(`   ❌ ${user.role} registration failed:`, data.message);
        if (data.error) {
          console.log(`   📝 Error details: ${data.error}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Network error for ${user.role}:`, error.message);
    }
  }

  console.log('\n3. Testing validation errors...');
  
  // Test validation errors
  for (const testCase of invalidTestCases) {
    console.log(`\n   Testing: ${testCase.name}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      });

      const data = await response.json();

      if (response.status === 400) {
        console.log(`   ✅ Validation error caught: ${data.error}`);
        if (data.error === testCase.expectedError) {
          console.log(`   ✅ Expected error message matches`);
        } else {
          console.log(`   ⚠️  Expected: "${testCase.expectedError}"`);
          console.log(`   ⚠️  Got: "${data.error}"`);
        }
      } else {
        console.log(`   ❌ Expected 400 status, got ${response.status}`);
        console.log(`   📝 Response:`, data);
      }
    } catch (error) {
      console.log(`   ❌ Network error:`, error.message);
    }
  }

  console.log('\n4. Testing duplicate email...');
  
  // Test duplicate email
  try {
    const duplicateUser = {
      name: 'Duplicate User',
      email: 'testuser1@example.com', // Same as first test user
      password: 'Password123',
      role: 'employee'
    };

    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateUser)
    });

    const data = await response.json();

    if (response.status === 409) {
      console.log('   ✅ Duplicate email error caught');
      console.log(`   📝 Message: ${data.message}`);
    } else {
      console.log(`   ❌ Expected 409 status, got ${response.status}`);
      console.log(`   📝 Response:`, data);
    }
  } catch (error) {
    console.log('   ❌ Network error:', error.message);
  }

  console.log('\n5. Testing edge cases...');
  
  // Test with minimal data (only required fields)
  try {
    const minimalUser = {
      name: 'Minimal User',
      email: 'minimal@example.com',
      password: 'Password123'
    };

    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalUser)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('   ✅ Minimal data registration successful');
      console.log(`   📧 Email: ${data.data.user.email}`);
      console.log(`   🎭 Role: ${data.data.user.role} (should default to employee)`);
    } else {
      console.log('   ❌ Minimal data registration failed:', data.message);
    }
  } catch (error) {
    console.log('   ❌ Network error:', error.message);
  }

  // Test with manager_id
  try {
    const userWithManager = {
      name: 'User With Manager',
      email: 'userwithmanager@example.com',
      password: 'Password123',
      role: 'employee',
      department: 'Engineering',
      manager_id: '550e8400-e29b-41d4-a716-446655440000' // Valid UUID format
    };

    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userWithManager)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('   ✅ User with manager_id registration successful');
      console.log(`   📧 Email: ${data.data.user.email}`);
      console.log(`   👨‍💼 Manager ID: ${data.data.user.managerId}`);
    } else {
      console.log('   ❌ User with manager_id registration failed:', data.message);
    }
  } catch (error) {
    console.log('   ❌ Network error:', error.message);
  }

  console.log('\n🎉 Register API testing completed!');
  console.log('\n📋 Summary:');
  console.log('- Tested successful registrations for all roles');
  console.log('- Tested validation errors for various invalid inputs');
  console.log('- Tested duplicate email handling');
  console.log('- Tested edge cases with minimal and optional data');
  console.log('\n💡 To run automated tests: npm test');
}

// Run the tests
testRegisterAPI().catch(console.error);
