// Simple test without database
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'test'
  });
});

// Mock login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@company.com' && password === 'password123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: '1',
          email: 'admin@company.com',
          name: 'Admin User',
          role: 'admin',
          department: 'HR',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        token: 'mock-jwt-token'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }
});

// Mock register endpoint
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, department } = req.body;
  
  res.json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: '2',
        email,
        name,
        role: role || 'employee',
        department,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      token: 'mock-jwt-token'
    }
  });
});

// Mock forgot password endpoint
app.post('/api/auth/forgot-password', (req, res) => {
  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent'
  });
});

// Mock protected route
app.get('/api/users/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  res.json({
    success: true,
    message: 'User profile endpoint',
    data: {
      id: '1',
      email: 'admin@company.com',
      name: 'Admin User',
      role: 'admin'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
