# Ezify Cloud Backend API

A robust Node.js + Express + TypeScript backend API for the Ezify Cloud Leave Management System.

## 🚀 Features

- **Authentication & Authorization** - JWT-based auth with role-based access control
- **User Management** - Complete CRUD operations for users
- **Leave Management** - Request, approve, and track leave requests
- **Database Integration** - PostgreSQL with Prisma ORM
- **Security** - Helmet, CORS, rate limiting, input validation
- **TypeScript** - Full type safety and better development experience
- **Modular Architecture** - Organized by features (login, user, leave modules)

## 📁 Project Structure

```
backend-ezifycloud/
├── src/
│   ├── lib/              # Prisma client and utilities
│   ├── middleware/       # Custom middleware (auth, error handling)
│   ├── modules/          # Feature-based modules
│   │   └── login/        # Login module (routes, controller, schema)
│   ├── routes/           # Main route files
│   ├── types/            # TypeScript type definitions
│   ├── app.ts            # Express app configuration
│   └── server.ts         # Main server file
├── prisma/
│   ├── schema.prisma     # Prisma schema
│   └── seed.ts           # Database seeding script
├── package.json
├── tsconfig.json
├── nodemon.json          # Development server configuration
├── env.example           # Environment variables template
└── README.md
```

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Security**: Helmet, CORS, bcryptjs
- **Development**: Nodemon, ts-node

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend-ezifycloud
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ezify_cloud?schema=public"
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Set up the database**
   ```bash
   # Create database
   createdb ezify_cloud
   
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed the database with initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

## 📚 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (protected)

### Users

- `GET /api/users/profile` - Get current user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (admin/manager only)

### Leave Requests

- `GET /api/leaves` - Get leave requests (protected)
- `POST /api/leaves` - Create leave request (protected)
- `GET /api/leaves/:id` - Get leave request by ID (protected)
- `PUT /api/leaves/:id` - Update leave request (protected)
- `PATCH /api/leaves/:id/status` - Approve/reject request (manager/admin only)

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database Schema

The database includes the following main tables:

- **users** - User accounts and profiles
- **leave_requests** - Leave request records
- **leave_balances** - User leave balances by year
- **leave_policies** - Configurable leave policies
- **audit_logs** - System activity logs
- **leave_documents** - File attachments for leave requests

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database and run migrations

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation with Joi
- SQL injection prevention with Prisma ORM

## 🚀 Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   NODE_ENV=production
   PORT=5000
   # ... other production configs
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team.