# Finance Dashboard

A personal finance dashboard application for tracking income, expenses, budgets, and savings goals.

## Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Account Management**: Track multiple financial accounts (checking, savings, etc.)
- **Transaction Tracking**: Record income and expenses with categorization
- **Budget Management**: Set monthly budgets per category and track spending
- **Savings Goals**: Set and track progress towards savings targets
- **Dashboard Overview**: View summaries, recent transactions, and budget vs actual spending

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd finance-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL database

Create a new PostgreSQL database:

```bash
createdb finance_dashboard
```

Or using psql:

```sql
CREATE DATABASE finance_dashboard;
```

### 4. Configure environment variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finance_dashboard
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 5. Initialize the database schema

Run the SQL schema file to create all necessary tables:

```bash
psql -d finance_dashboard -f config/db-schema.sql
```

Or using psql interactively:

```bash
psql -d finance_dashboard
\i config/db-schema.sql
```

### 6. Start the server

For development (with auto-reload):

```bash
npm run dev
```

For production:

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Accounts
- `GET /api/accounts` - Get all accounts
- `GET /api/accounts/:id` - Get specific account
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get specific category
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Transactions
- `GET /api/transactions` - Get all transactions (supports query params: start_date, end_date, category_id, account_id, transaction_type)
- `GET /api/transactions/recurring` - Get recurring transactions
- `GET /api/transactions/:id` - Get specific transaction
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Budgets
- `GET /api/budgets` - Get all budgets (supports query params: month, year)
- `GET /api/budgets/:id` - Get specific budget
- `POST /api/budgets` - Create new budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Savings Goals
- `GET /api/savings-goals` - Get all savings goals
- `GET /api/savings-goals/:id` - Get specific savings goal
- `POST /api/savings-goals` - Create new savings goal
- `PUT /api/savings-goals/:id` - Update savings goal
- `DELETE /api/savings-goals/:id` - Delete savings goal

### Dashboard
- `GET /api/dashboard` - Get dashboard summary data (supports query params: month, year)

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Example API Usage

### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Create an account (with authentication)

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{
    "account_name": "Checking Account",
    "balance": 5000.00,
    "account_type": "Checking"
  }'
```

## Project Structure

```
finance-dashboard/
├── config/
│   ├── database.js          # PostgreSQL connection pool
│   └── db-schema.sql        # Database schema
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── accounts.js          # Account routes
│   ├── categories.js        # Category routes
│   ├── transactions.js      # Transaction routes
│   ├── budgets.js           # Budget routes
│   ├── savings-goals.js     # Savings goal routes
│   └── dashboard.js         # Dashboard routes
├── server.js                # Express server setup
├── package.json
└── README.md
```

## Next Steps

- [ ] Build frontend interface (HTML, CSS, JavaScript)
- [ ] Add data visualization with Chart.js
- [ ] Implement unit and integration tests
- [ ] Add input validation and error handling improvements
- [ ] Deploy to production

## License

ISC
