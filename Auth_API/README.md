```markdown
# Hospital Management System - Auth Service

Authentication and Authorization service for the Hospital Management System, built with **FastAPI**.

## ✨ Features

- User Registration & Login (Email/Password)
- JWT Authentication (Access + Refresh Tokens)
- OAuth2 Login (GitHub & Google)
- Role-Based Access Control (Patient, Doctor, Admin)
- Comprehensive System Logging (Audit Trail)
- Secure Password Hashing with bcrypt
- PostgreSQL Integration
- Docker Support

## 🛠 Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL + SQLAlchemy
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt
- **OAuth**: GitHub & Google OAuth2
- **Container**: Docker + Docker Compose
- **Logging**: Custom System Logs Table

## 📁 Project Structure

```bash
auth-service/
├── app/
│   ├── main.py
│   ├── core/          # config, database, security
│   ├── models/        # User, SystemLog
│   ├── routers/       # auth.py, oauth.py
│   ├── schemas/       # Pydantic models
│   ├── dependencies/  # auth middleware
│   └── utils/         # system_logger
├── Dockerfile
├── requirements.txt
└── alembic/           # (Future migrations)
```

## 🚀 Quick Start

### 1. Clone & Setup

```bash
cd hospital-ms
cp .env.example .env
```

### 2. Configure `.env`

```env
# Postgres
POSTGRES_DB=hospital
POSTGRES_USER=admin
POSTGRES_PASSWORD=StrongPass2026!

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-123456789
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth (Optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:8001/auth/github/callback

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8001/auth/google/callback
```

### 3. Run with Docker

```bash
# Start all services
docker-compose up -d

# Or start only auth + postgres
docker-compose up -d postgres auth-service
```

### 4. Check Service

```bash
# Check if running
curl http://localhost:8001/

# View logs
docker-compose logs -f auth-service
```

---

## 📋 API Endpoints

### Public Routes
| Method | Endpoint              | Description |
|--------|-----------------------|-----------|
| POST   | `/auth/register`      | Register new user |
| POST   | `/auth/login`         | Login with email/password |
| POST   | `/auth/refresh`       | Refresh access token |

### OAuth Routes
| Method | Endpoint                    | Description |
|--------|-----------------------------|-----------|
| GET    | `/auth/github/login`        | GitHub OAuth |
| GET    | `/auth/google/login`        | Google OAuth |

### Protected Routes
| Method | Endpoint                  | Role Required |
|--------|---------------------------|-------------|
| GET    | `/auth/me`                | Any |
| GET    | `/auth/profile`           | Any |
| POST   | `/auth/logout`            | Any |
| PATCH  | `/auth/update-role/{id}`  | Admin |

---

## 🧪 Testing with Postman

Import the collection or test manually:

- **Register**: `POST /auth/register`
- **Login**: `POST /auth/login` → Copy `access_token`
- **Protected**: Add Header `Authorization: Bearer {{access_token}}`

---

## 🗄 Database

### Check Tables

```bash
# Users
docker-compose exec postgres psql -U admin -d hospital -c "SELECT * FROM users;"

# System Logs
docker-compose exec postgres psql -U admin -d hospital -c "SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## 📌 Future Improvements

- Rate limiting
- Email verification
- Password reset flow
- Alembic migrations
- API Gateway integration

---

## 🤝 Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push and open a Pull Request

---

**Made with ❤️ for Hospital Management System**

```

---

- Include API documentation (Swagger) link?

Just tell me if you want any modifications!
