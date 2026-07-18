# MYLOC.DZ Backend

A lightweight PHP + MySQL REST API for the MYLOC.DZ car rental platform.

## Overview

This backend provides:

- Client sign-up and sign-in
- Seeded admin account
- JWT-based authentication with role checks
- Admin car management (create, edit, deactivate)
- Client car browsing and reservation creation
- Overlap prevention for car reservations
- Rate-limited login attempts
- CORS configured for known frontend origins

## Technology Stack

- PHP 8.1+
- MySQL / MariaDB (PDO)
- Composer
- `vlucas/phpdotenv` for environment configuration
- `firebase/php-jwt` for JSON Web Tokens

## Project Structure

```
myloc-backend/
├── public/
│   └── index.php              # API entry point and router
├── src/
│   ├── Config/
│   │   └── Database.php       # PDO connection
│   ├── Middleware/
│   │   ├── AuthMiddleware.php # JWT validation and role checks
│   │   └── CorsMiddleware.php # CORS handling
│   ├── Controllers/
│   │   ├── AuthController.php
│   │   ├── CarController.php
│   │   └── ReservationController.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Car.php
│   │   └── Reservation.php
│   ├── Utils/
│   │   ├── JwtHelper.php
│   │   ├── RateLimiter.php
│   │   ├── Response.php
│   │   └── Validator.php
│   └── Router.php             # Small regex-based router
├── database/
│   ├── migrations.sql         # Schema creation
│   └── seed.php               # Admin account seeder
├── .env.example               # Environment template
├── .gitignore
├── composer.json
└── composer.lock
```

## Setup

### 1. Install dependencies

```bash
cd myloc-backend
composer install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and a strong JWT secret:

```dotenv
DB_HOST=localhost
DB_PORT=3307          # WAMP MariaDB default; use 3306 for standard MySQL
DB_NAME=myloc_db
DB_USER=root
DB_PASS=
DB_CHARSET=utf8mb4

JWT_SECRET=your_strong_random_secret_at_least_32_chars
JWT_EXPIRY=3600

ALLOWED_ORIGINS=http://localhost:3000,https://ahcene-sa.github.io
```

### 3. Create the database

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS myloc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 4. Run migrations

```bash
mysql -u root myloc_db < database/migrations.sql
```

### 5. Seed the admin account

```bash
php database/seed.php
```

This creates one admin account:

- Email: `admin@admin`
- Password: `admin`

**Important:** These are placeholder development credentials. Change them before any real deployment.

### 6. Start the development server

```bash
php -S localhost:8000 -t public public/index.php
```

The API is now available at `http://localhost:8000`.

## API Endpoints

### Auth

| Method | Endpoint             | Access | Description                     |
|--------|----------------------|--------|---------------------------------|
| POST   | `/api/auth/register` | Public | Client sign-up                  |
| POST   | `/api/auth/login`    | Public | Client or admin sign-in         |
| GET    | `/api/auth/me`       | Auth   | Current authenticated user info |

### Cars

| Method | Endpoint            | Access | Description                          |
|--------|---------------------|--------|--------------------------------------|
| GET    | `/api/cars`         | Public | List available cars (filter by `?category=suv`) |
| GET    | `/api/cars/{id}`    | Public | Car detail                           |
| POST   | `/api/cars`         | Admin  | Create a car                         |
| PUT    | `/api/cars/{id}`    | Admin  | Update a car                         |
| DELETE | `/api/cars/{id}`    | Admin  | Mark a car as unavailable            |

### Reservations

| Method | Endpoint                              | Access  | Description                        |
|--------|---------------------------------------|---------|------------------------------------|
| POST   | `/api/reservations`                   | Client  | Create a reservation               |
| GET    | `/api/reservations/me`                | Client  | List own reservations              |
| GET    | `/api/reservations`                   | Admin   | List all reservations              |
| PATCH  | `/api/reservations/{id}/status`     | Admin   | Confirm or cancel a reservation    |

## Sample `curl` Tests

### Admin login

```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin","password":"admin"}'
```

Save the returned `token` as `$ADMIN_TOKEN`.

### Client registration

```bash
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Ahmed Benali","email":"ahmed@test.com","phone":"+213 550 00 00 00","password":"password123"}'
```

Save the returned `token` as `$CLIENT_TOKEN`.

### Create a car (admin)

```bash
curl -s -X POST http://localhost:8000/api/cars \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"category":"citadine","name":"Fiat 500","description":"Compact city car","price_per_day":45,"transmission":"Manuelle","seats":4,"year":2025,"image_url":"images/car-fiat-500.png"}'
```

### List cars (public)

```bash
curl -s "http://localhost:8000/api/cars"
```

### Create a reservation (client)

```bash
curl -s -X POST http://localhost:8000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{"car_id":1,"start_date":"2026-08-01","end_date":"2026-08-05","full_name":"Ahmed Benali","email":"ahmed@test.com","phone":"+213 550 00 00 00"}'
```

### Rejected overlapping reservation (client)

```bash
curl -s -X POST http://localhost:8000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -d '{"car_id":1,"start_date":"2026-08-03","end_date":"2026-08-07","full_name":"Ahmed Benali","email":"ahmed@test.com","phone":"+213 550 00 00 00"}'
```

Expected response:

```json
{"success":false,"error":"Car is not available for the selected dates."}
```

### List all reservations (admin)

```bash
curl -s "http://localhost:8000/api/reservations" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Confirm a reservation (admin)

```bash
curl -s -X PATCH http://localhost:8000/api/reservations/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"confirmed"}'
```

## Security Measures Implemented

- **Password hashing:** `password_hash()` with `PASSWORD_BCRYPT`. Passwords are never stored in plaintext, including the seeded admin account.
- **JWT tokens:** Short-lived access tokens (1 hour by default) containing only `user_id` and `role`. No sensitive data is exposed in the JWT payload.
- **Role-based authorization:** `AuthMiddleware` validates the JWT and enforces `admin` or `client` roles on protected routes.
- **Rate limiting:** Repeated failed login attempts per email are throttled to reduce brute-force risk.
- **Input validation:** All incoming fields are validated for type, presence, and length before any database interaction.
- **PDO prepared statements:** All SQL queries use prepared statements to prevent SQL injection.
- **CORS:** Allowed origins are restricted to the frontend origins defined in `.env`, not `*`.
- **Error handling:** Generic error messages are returned to clients. Detailed errors are logged server-side.
- **CSRF hygiene:** Tokens are sent via the `Authorization: Bearer` header, not cookies, avoiding cookie-based CSRF risks.

## Production Checklist

- Serve the API over HTTPS only.
- Change the seeded admin credentials.
- Use a strong, randomly generated `JWT_SECRET` of at least 32 characters.
- Restrict `ALLOWED_ORIGINS` to the exact production frontend URL.
- Use a dedicated database user with limited privileges instead of `root`.
- Enable proper logging and monitoring.
- Keep dependencies up to date with `composer update`.
