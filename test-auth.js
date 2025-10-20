// Simple test script for authentication endpoints
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testHealth() {
  try {
    console.log('🔍 Testing health endpoint...');
    const response = await fetch('http://localhost:5000/health');
    const data = await response.json();
    console.log('✅ Health check:', data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testLogin() {
  try {
    console.log('\n🔍 Testing login endpoint...');
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@company.com',
        password: 'password123'
      }),
    });
    
    const data = await response.json();
    console.log('✅ Login response:', data);
    return data.success ? data.data.token : null;
  } catch (error) {
    console.log('❌ Login failed:', error.message);
    return null;
  }
}

async function testRegister() {
  try {
    console.log('\n🔍 Testing register endpoint...');
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@company.com',
        password: 'password123',
        role: 'employee',
        department: 'Engineering'
      }),
    });
    
    const data = await response.json();
    console.log('✅ Register response:', data);
    return data.success ? data.data.token : null;
  } catch (error) {
    console.log('❌ Register failed:', error.message);
    return null;
  }
}

async function testForgotPassword() {
  try {
    console.log('\n🔍 Testing forgot password endpoint...');
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@company.com'
      }),
    });
    
    const data = await response.json();
    console.log('✅ Forgot password response:', data);
    return data.success;
  } catch (error) {
    console.log('❌ Forgot password failed:', error.message);
    return false;
  }
}

async function testProtectedRoute(token) {
  if (!token) {
    console.log('\n⏭️ Skipping protected route test - no token');
    return;
  }
  
  try {
    console.log('\n🔍 Testing protected route...');
    const response = await fetch(`${API_BASE}/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('✅ Protected route response:', data);
    return data.success;
  } catch (error) {
    console.log('❌ Protected route failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting authentication endpoint tests...\n');
  
  // Test health endpoint
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('\n❌ Server is not running. Please start the server first.');
    return;
  }
  
  // Test login
  const loginToken = await testLogin();
  
  // Test register
  const registerToken = await testRegister();
  
  // Test forgot password
  const forgotPasswordOk = await testForgotPassword();
  
  // Test protected route
  await testProtectedRoute(loginToken || registerToken);
  
  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);
