# Database Query Portal (PRD-PQED)

A secure, role-based portal for developers to submit database queries and scripts for execution against restricted databases. Managers (POD Leads) review requests before execution, ensuring data security and compliance.

## Features

- **Role-Based Access Control (RBAC)**
  - **Developers**: Submit queries/scripts, view submission history
  - **Managers (POD Leads)**: Review, approve, or reject requests for their POD
  - **Admins**: Manage users and database instances

- **Submission Types**
  - **SQL Queries**: Direct execution for PostgreSQL
  - **MongoDB Queries**: JSON-based query execution
  - **Scripts**: Upload and execute JavaScript scripts with isolated worker threads

- **Security & Safety**
  - **Destructive Query Detection**: Automated warnings for `DROP`, `DELETE`, `TRUNCATE`, etc.
  - **Script Isolation**: Scripts run in `worker_threads` with `vm2` sandboxing and strict timeouts
  - **Read-Only Enforcement**: Database connections can be configured for read-only access
  - **Approvals**: Mandatory manager approval for execution

- **Integrations**
  - **Slack Notifications**: Real-time alerts for new requests and status updates
  - **CSV Export**: Download full result sets for large queries
  - **Cloud Storage**: Script files securely stored via Cloudinary

## Tech Stack

- **Frontend**: React, Vite, CSS Modules
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (application data & logs)
- **ORM**: MikroORM
- **Authentication**: JWT, custom RBAC middleware
- **Testing**: Jest, React Testing Library, Supertest
- **Execution Engine**:
  - PostgreSQL (`pg`)
  - MongoDB (`mongodb`, `mongoose`)
  - Isolated Script Runner (`worker_threads`, `vm2`)

## Project Structure

```
PRD-PQED/
├── package.json              # Root-level test orchestration
├── backend/
│   ├── src/
│   │   ├── config/           # DB & Cloudinary config
│   │   ├── controllers/      # Request & Auth logic
│   │   ├── entities/         # MikroORM Entities
│   │   ├── middleware/       # Auth, RBAC, Validation
│   │   ├── routes/           # API Routes
│   │   ├── services/         # Executors, Slack, Destructive Detector
│   │   └── utils/            # File upload, Helpers
│   └── tests/                # Backend unit & integration tests
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # Auth Context
│   │   ├── pages/            # Application Pages
│   │   └── api/              # API Client
│   └── src/**/__tests__/     # Frontend component tests
└── coverage/                 # Combined test coverage reports
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL
- MongoDB (optional, for target databases)
- Cloudinary Account (for script uploads)

### Backend Setup
```bash
cd backend
npm install
# Configure .env with DB credentials and Cloudinary keys
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Testing Guide

### Quick Start

Run all tests from the project root:

```bash
# Install root dependencies (first time only)
npm install

# Run all tests (backend + frontend)
npm test

# Run with coverage summary
npm run test:combined
```

### Available Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run both backend and frontend tests |
| `npm run test:backend` | Run only backend tests with coverage |
| `npm run test:frontend` | Run only frontend tests with coverage |
| `npm run test:combined` | Full run with coverage cleanup and summary |
| `npm run coverage:clean` | Remove all coverage directories |

### Running Tests Individually

```bash
# Backend tests only
cd backend && npm test

# Backend with coverage
cd backend && npm test -- --coverage

# Frontend tests only
cd frontend && npm test

# Frontend with coverage
cd frontend && npm test -- --coverage
```

### Test Structure

**Backend Tests** (`backend/tests/`)
- Unit tests for controllers, services, entities
- Integration tests for API endpoints
- Schema validation tests
- Error handling coverage

**Frontend Tests** (`frontend/src/**/__tests__/`)
- Component rendering tests
- User interaction tests
- Context and hook tests
- API integration mocks

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get current user info |
| PATCH | `/api/auth/profile` | Update user profile |

### Query Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/requests` | Submit query/script |
| GET | `/api/requests` | List requests (with filters) |
| GET | `/api/requests/my-submissions` | Get user's submissions |
| GET | `/api/requests/:id` | Get request details |
| PATCH | `/api/requests/:id` | Approve/Reject (Manager) |
| GET | `/api/requests/:id/csv` | Download execution results |

## Security Features

- **Strict Validations**: Zod schemas for all inputs
- **Worker Threads**: Prevents main thread blocking during script execution
- **Input Sanitization**: Prevents basic injection attacks
- **Destructive Operation Warnings**: Alerts managers before approving dangerous queries

## Status: ✅ Production Ready

- [x] Full Authentication & RBAC
- [x] Query & Script Execution Engines
- [x] Approval Workflows
- [x] Slack Integration
- [x] Frontend UI (Dashboard, Approvals, History)
- [x] Security Hardening (Worker Threads, Destructive Checks)
- [x] Comprehensive Test Suite (626 tests, ~86% branch coverage)
