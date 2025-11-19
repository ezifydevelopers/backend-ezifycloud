# Ezify Cloud API - Postman Collection

## Overview

This Postman collection contains all the API endpoints for the Ezify Cloud Leave Management System. The collection is organized by modules for easy navigation.

## Setup Instructions

### 1. Import the Collection

1. Open Postman
2. Click **Import** button
3. Select the file: `Ezify-Cloud-API.postman_collection.json`
4. The collection will be imported with all folders and requests

### 2. Configure Environment Variables

The collection uses the following variables:

- `base_url`: Base URL of your API server (default: `http://localhost:5000`)
- `auth_token`: JWT authentication token (will be set automatically after login)

**To set up variables:**

1. Click on the collection name
2. Go to the **Variables** tab
3. Set `base_url` to your server URL (e.g., `http://localhost:5000` or `https://api.ezify.com`)
4. `auth_token` will be automatically set when you use the Login request

### 3. Get Authentication Token

1. Use the **Login** request in the **Authentication** folder
2. Update the email and password in the request body
3. Send the request
4. Copy the `token` from the response
5. Set it as the `auth_token` variable in the collection

**Or use Postman's automatic token extraction:**

1. In the Login request, go to **Tests** tab
2. Add this script:
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    if (jsonData.token) {
        pm.collectionVariables.set("auth_token", jsonData.token);
    }
}
```

## Collection Structure

### 1. Health Check
- Health check endpoint to verify server is running

### 2. Authentication
- Login
- Register
- Forgot Password
- Reset Password
- Change Password

### 3. Users
- Get Current User Profile
- Update User Profile
- Get All Users (Admin)
- Get User By ID
- Create User (Admin)
- Update User (Admin)
- Delete User (Admin)
- Toggle User Status (Admin)

### 4. Admin - Dashboard
- Get Dashboard Stats
- Get Quick Stats
- Get Department Stats
- Get Recent Activities
- Get Monthly Leave Trend
- Get System Overview

### 5. Admin - Employees
- Get Employees
- Get Employee By ID
- Create Employee
- Update Employee
- Delete Employee
- Permanently Delete Employee
- Get Paid/Unpaid Leave Stats
- Get Employee Leave Balance
- Adjust Employee Leave Balance

### 6. Admin - Leave Policies
- Get Leave Policies
- Get Leave Policy By ID
- Create Leave Policy
- Update Leave Policy
- Delete Leave Policy
- Get Leave Policy Types
- Get Leave Policy Stats

### 7. Admin - Leave Requests
- Get Leave Requests
- Get Leave Request By ID
- Update Leave Request Status
- Get Leave Request Stats

### 8. Admin - Holidays
- Get Holidays
- Create Holiday
- Update Holiday
- Delete Holiday

### 9. Employee - Dashboard
- Get Dashboard Stats
- Get Personal Info
- Get Leave Balance
- Get Recent Leave Requests
- Get Upcoming Holidays

### 10. Employee - Leave Requests
- Create Leave Request
- Get Leave Requests
- Get Leave Request By ID
- Update Leave Request
- Cancel Leave Request
- Get Leave History

### 11. Employee - Profile
- Get Profile
- Update Profile
- Update Password

### 12. Manager - Dashboard
- Get Dashboard Stats
- Get Quick Stats
- Get Team Performance
- Get Upcoming Leaves

### 13. Manager - Approvals
- Get Leave Approvals
- Process Approval
- Get Pending Count

### 14. Manager - Team
- Get Team Members
- Get Team Member By ID
- Get Team Stats

### 15. Workspaces
- Create Workspace
- Get User Workspaces
- Get Workspace By ID
- Update Workspace
- Get Workspace Members
- Invite Member

### 16. Boards
- Create Board
- Get Workspace Boards
- Get Board By ID
- Create Column
- Create Item

### 17. Approvals
- Request Approval
- Get Item Approvals
- Get My Pending Approvals
- Update Approval (Approve/Reject)

## Additional Endpoints Not Included

The following endpoints are available but not included in this collection (you can add them manually):

### Admin - Additional Endpoints
- `/api/admin/attendance/*` - Attendance management
- `/api/admin/salaries/*` - Salary management
- `/api/admin/settings/*` - System settings
- `/api/admin/working-days/*` - Working days calculation
- `/api/admin/employees/probation/*` - Probation management
- `/api/admin/leave-accrual/*` - Leave accrual management

### Manager - Additional Endpoints
- `/api/manager/team/members/*` - Team member management
- `/api/manager/salaries/*` - Team salary management
- `/api/manager/leave-requests/*` - Manager leave requests

### Employee - Additional Endpoints
- `/api/employee/policies/*` - Leave policies (read-only)
- `/api/employee/holidays/*` - Holidays
- `/api/employee/calendar/*` - Calendar events
- `/api/employee/settings/*` - User settings

### Other Modules
- `/api/comments/*` - Comments
- `/api/files/*` - File management
- `/api/notifications/*` - Notifications
- `/api/dashboards/*` - Custom dashboards
- `/api/reports/*` - Reports
- `/api/templates/*` - Templates
- `/api/invoice-templates/*` - Invoice templates
- `/api/currency/*` - Currency management
- `/api/automations/*` - Automations
- `/api/ai/*` - AI features
- `/api/permissions/*` - Permissions
- `/api/audit/*` - Audit logs
- `/api/backup/*` - Backup management
- `/api/customization/*` - Customization

## Usage Tips

### 1. Testing Authentication
Always start by testing the Login endpoint to get your authentication token.

### 2. Role-Based Access
- **Admin** endpoints require `role: "admin"` in the JWT token
- **Manager** endpoints require `role: "manager"` in the JWT token
- **Employee** endpoints require `role: "employee"` in the JWT token

### 3. Request Body Examples
Most POST/PUT requests include example request bodies. Update them with your actual data.

### 4. Path Variables
Replace path variables like `:id`, `:userId`, etc. with actual UUIDs from your database.

### 5. Query Parameters
Many GET requests support query parameters for filtering, pagination, etc. Check the request URL for available parameters.

## Common Request Patterns

### Pagination
```
GET /api/admin/employees?page=1&limit=10
```

### Filtering
```
GET /api/admin/leave-requests?status=pending&leaveType=annual
```

### Date Ranges
```
GET /api/admin/dashboard/stats?startDate=2024-01-01&endDate=2024-12-31
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## Success Responses

All endpoints follow a consistent success response format:

```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

## Support

For issues or questions:
1. Check the API documentation in the codebase
2. Review the route files in `backend-ezifycloud/src/modules/*/routes/`
3. Check controller files for request/response formats

## Updating the Collection

To add more endpoints:
1. Export the current collection
2. Add new requests following the existing structure
3. Use consistent naming and organization
4. Include example request bodies where applicable
5. Set proper authentication headers

