# Database Query Portal (PRD-PQED)

A secure, role-based portal for developers to submit database queries and scripts for execution against restricted databases. Managers (POD Leads) review requests before execution, ensuring data security and compliance.

## Features

- **Role-Based Access Control (RBAC)**
  - **Developers**: Submit queries/scripts, view submission history
  - **Managers (POD Leads)**: Review, approve, or reject requests for their POD
  - **Admins**: Manage users and database instances

- **Submission Types**
  - **SQL Queries**: Direct execution for PostgreSQL and MongoDB
  - **Scripts**: Upload and execute JavaScript scripts with database access

- **Automated Execution**
  - Approved queries execute automatically against target database
  - Results (or errors) are captured and stored

- **Audit Trail**: Full history of requests, approvals, and execution results

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: PostgreSQL (application data)
- **ORM**: Sequelize
- **Authentication**: JWT with Role-Based middleware
- **Execution Engine**: PostgreSQL, MongoDB, and Script adapters

## Project Structure

```
PRD-PQED/
├── backend/
│   ├── src/
│   │   ├── config/         # DB instances, Pods config
│   │   ├── controllers/    # Request handling logic
│   │   ├── middleware/     # Auth & RBAC
│   │   ├── models/         # Sequelize Models
│   │   ├── routes/         # API Routes
│   │   ├── services/       # Execution engines
│   │   └── utils/          # Utilities (file upload, crypto)
│   ├── scripts/test/       # Test scripts for execution
│   └── uploads/            # Uploaded script files
└── frontend/               # Frontend Application
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL (local or Docker)
- Docker (for test databases)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure credentials
npm start
```

### Test Databases (Docker)
```bash
# PostgreSQL (port 5433)
docker run --name test-postgres -e POSTGRES_PASSWORD=password -p 5433:5432 -d postgres:15

# MongoDB (port 27017)
docker run --name test-mongo -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password -p 27017:27017 -d mongo:7
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/logout` | Logout |

### Database Instances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/database-instances` | List all instances |
| GET | `/api/database-instances?instance=name` | List databases in instance |

### Query Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/requests` | Submit query/script |
| GET | `/api/requests` | List requests (paginated) |
| GET | `/api/requests/my-submissions` | Get user's submissions |
| GET | `/api/requests/:id` | Get request details |
| PUT | `/api/requests/:id` | Approve/Reject (Manager) |

### Pods
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pods` | List available PODs |

## Database Instances (Test)

| Instance | Type | Port | Available Databases |
|----------|------|------|---------------------|
| `test-postgres` | POSTGRESQL | 5433 | ecommerce_db, hr_system, inventory_db, analytics_db |
| `test-mongo` | MONGODB | 27017 | logs_db, customer_db, metrics_db, sessions_db |

## Postman Collection

Import `backend/postman_collection.json` for ready-to-use API requests.

## Status: ✅ Backend Complete

- [x] Authentication (JWT)
- [x] RBAC (Developer, Manager, Admin)
- [x] Query Submission & Approval Workflow
- [x] PostgreSQL Query Execution
- [x] MongoDB Query Execution
- [x] Script Execution (JavaScript)
- [x] Execution Result Storage
- [ ] Frontend Application
