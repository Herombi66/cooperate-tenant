# IMAN MCS Backend

Express.js backend for the IMAN Cooperative Society Management System.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your database credentials and JWT secret.

4. Set up PostgreSQL database and run migrations:
   ```bash
   # Create database
   createdb imanmcs_db

   # Run migrations (if using SQL files)
   psql -d imanmcs_db -f db/migrations/001-create-users-table.sql

   # Or seed the database with test users
   npm run seed
   ```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile (requires authentication)

### Members Management
- `GET /members` - Get all active members (paginated, filtered)
- `GET /members/:id` - Get member by ID
- `PUT /members/:id` - Update member
- `DELETE /members/:id` - Soft delete member
- `PUT /members/:id/suspend` - Suspend member
- `PUT /members/:id/activate` - Activate member
- `PUT /members/:id/reset-password` - Reset member password
- `GET /members/export` - Export members to CSV

### Membership Applications (Unified System)
- `POST /applications/apply` - Submit membership application (public)
- `GET /applications` - Get all applications (admin only)
- `GET /applications/:id` - Get application by ID
- `POST /applications/admin/create-member` - Create member directly (auto-approved)
- `POST /applications/admin/bulk-import` - Bulk import members (auto-approved)
- `PUT /applications/:id/status` - Update application status

### Contributions
- `GET /contributions` - List contributions (members: own records only; admins: filter by member/month/year/status/search)
- `GET /contributions/stats` - Contribution statistics (filter by month/year)
- `POST /contributions` - Create a contribution (members: own account only; admins: can target members)
- `POST /contributions/by-psn` - Create an approved contribution by member PSN (admin roles)
- `POST /contributions/bulk-upload` - Bulk upload contributions via CSV/XLSX (admin roles)
- `GET /contributions/commitment` - Member commitment/rules and pending increase request
- `POST /contributions/increase-requests` - Member submits commitment increase request (with optional supporting document)
- `GET /contributions/increase-requests/my` - Member views own increase requests
- `GET /contributions/increase-requests` - Admin lists increase requests
- `POST /contributions/increase-requests/:id/approve` - Admin approves request
- `POST /contributions/increase-requests/:id/reject` - Admin rejects request

Contribution policy:
- Members can make unlimited contributions within a single month.
- Registration fee applies only to the first-ever contribution for a member.
- Monthly admin fee applies at most once per month per member; additional contributions in the same month do not re-apply the monthly fee.

### Health Check
- `GET /health` - Server health check

## Testing

Run the test suite:
```bash
npm test
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Rate limiting on login attempts
- Helmet security headers
- CORS protection
- Input validation

## Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `psn` (VARCHAR(50) UNIQUE) - Personal Subhead Number
- `name` (VARCHAR(255))
- `email` (VARCHAR(255) UNIQUE)
- `password_hash` (VARCHAR(255))
- `role` (ENUM: admin, member, treasurer, chairman)
- `is_default_password` (BOOLEAN)
- `status` (ENUM: active, inactive, suspended)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
