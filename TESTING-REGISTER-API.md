# Testing Register API

This document provides comprehensive testing instructions for the Register API endpoint.

## Prerequisites

1. **Start the backend server:**
   ```bash
   npm run dev
   ```

2. **Ensure PostgreSQL database is running and connected**

3. **Run database migrations if needed:**
   ```bash
   npm run db:push
   ```

## Automated Test Script

We've created an automated test script that tests all scenarios:

```bash
node test-register-api.js
```

This script will test:
- ✅ Server health check
- ✅ Successful registration for employee, manager, and admin roles
- ✅ Validation errors (invalid email, weak password, missing fields, etc.)
- ✅ Duplicate email handling
- ✅ Edge cases (minimal data, optional fields)

## Manual Testing with cURL or Postman

### 1. Successful Registration

#### Employee Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "Password123",
    "role": "employee",
    "department": "Engineering"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "employee",
      "department": "Engineering",
      "managerId": null,
      "profilePicture": null,
      "isActive": true,
      "createdAt": "2025-10-01T...",
      "updatedAt": "2025-10-01T..."
    },
    "token": "jwt-token-here"
  }
}
```

#### Manager Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Manager",
    "email": "jane.manager@example.com",
    "password": "Password123",
    "role": "manager",
    "department": "HR"
  }'
```

#### Admin Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "Password123",
    "role": "admin",
    "department": "IT"
  }'
```

#### Registration with Manager ID
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Employee User",
    "email": "employee@example.com",
    "password": "Password123",
    "role": "employee",
    "department": "Engineering",
    "manager_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### 2. Validation Errors

#### Missing Name (400)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Name is required"
}
```

#### Invalid Email Format (400)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type": application/json" \
  -d '{
    "name": "Test User",
    "email": "invalid-email",
    "password": "Password123"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Please provide a valid email address"
}
```

#### Weak Password - No Uppercase (400)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Password must contain at least one lowercase letter, one uppercase letter, and one number"
}
```

#### Weak Password - No Lowercase (400)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "PASSWORD123"
  }'
```

#### Weak Password - No Number (400)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Password"
  }'
```

#### Password Too Short (400)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Pass1"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Password must be at least 6 characters long"
}
```

#### Invalid Role (400)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Password123",
    "role": "invalid_role"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Role must be admin, manager, or employee"
}
```

#### Invalid Manager ID Format (400)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Password123",
    "manager_id": "not-a-uuid"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Manager ID must be a valid UUID"
}
```

### 3. Duplicate Email

Register a user, then try to register with the same email again:

```bash
# First registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "duplicate@example.com",
    "password": "Password123"
  }'

# Second registration with same email
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another User",
    "email": "duplicate@example.com",
    "password": "Password456"
  }'
```

**Expected Response (409):**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### 4. Edge Cases

#### Minimal Data (Only Required Fields)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minimal User",
    "email": "minimal@example.com",
    "password": "Password123"
  }'
```

**Expected:** Should default role to 'employee' and department to null.

#### Null Manager ID
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Without Manager",
    "email": "nomanager@example.com",
    "password": "Password123",
    "manager_id": null
  }'
```

## Test Checklist

### ✅ Validation Tests
- [ ] Missing name returns 400
- [ ] Name too short (< 2 chars) returns 400
- [ ] Name too long (> 50 chars) returns 400
- [ ] Missing email returns 400
- [ ] Invalid email format returns 400
- [ ] Missing password returns 400
- [ ] Password too short (< 6 chars) returns 400
- [ ] Weak password (no uppercase) returns 400
- [ ] Weak password (no lowercase) returns 400
- [ ] Weak password (no number) returns 400
- [ ] Invalid role returns 400
- [ ] Department too long (> 100 chars) returns 400
- [ ] Invalid manager_id format returns 400

### ✅ Success Tests
- [ ] Employee registration returns 201 with user data and token
- [ ] Manager registration returns 201 with user data and token
- [ ] Admin registration returns 201 with user data and token
- [ ] Registration with manager_id returns 201
- [ ] Minimal data registration returns 201 (defaults to employee role)
- [ ] Password is hashed in database (not stored in plain text)
- [ ] JWT token is valid and can be used for authentication

### ✅ Error Handling Tests
- [ ] Duplicate email returns 409
- [ ] Database connection error returns 500

### ✅ Security Tests
- [ ] Password is not returned in response
- [ ] Password is hashed with bcrypt (12 salt rounds)
- [ ] JWT token expires in 7 days (or as configured)
- [ ] JWT token contains userId, email, and role

## API Endpoint Details

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```typescript
{
  name: string (required, 2-50 chars)
  email: string (required, valid email)
  password: string (required, min 6 chars, must contain uppercase, lowercase, number)
  role?: "admin" | "manager" | "employee" (optional, defaults to "employee")
  department?: string (optional, max 100 chars)
  manager_id?: string | null (optional, must be valid UUID)
}
```

**Success Response (201):**
```typescript
{
  success: true
  message: "Registration successful"
  data: {
    user: {
      id: string
      name: string
      email: string
      role: string
      department: string | null
      managerId: string | null
      profilePicture: string | null
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }
    token: string
  }
}
```

**Error Responses:**
- `400` - Validation error
- `409` - Duplicate email
- `500` - Internal server error

## Database Verification

After registration, you can verify the user in the database:

```sql
SELECT id, name, email, role, department, manager_id, is_active, created_at 
FROM users 
WHERE email = 'test@example.com';
```

Or using Prisma Studio:
```bash
npm run db:studio
```

## Notes

1. **Password Security:** Passwords are hashed using bcrypt with 12 salt rounds
2. **JWT Token:** Token expires in 7 days (configurable via JWT_EXPIRES_IN)
3. **Default Role:** If role is not provided, it defaults to 'employee'
4. **Active Status:** New users are created with `is_active: true`
5. **Manager ID:** Can be null or a valid UUID of another user

## Troubleshooting

### Server not responding
- Ensure the server is running: `npm run dev`
- Check if the port 3000 is available
- Check console for any errors

### Database errors
- Verify PostgreSQL is running
- Check database connection string in `.env`
- Run migrations: `npm run db:push`

### Validation errors
- Ensure all required fields are provided
- Check password meets strength requirements
- Verify email is in correct format
- Ensure manager_id is a valid UUID if provided
