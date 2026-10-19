# Yozigo – Movie Ticket Booking App

A full-stack movie ticket booking application that allows customers to browse movies, view showtimes, select seats, hold seats temporarily, and book movie tickets. Administrators can manage movies and shows and access booking information.

## 1. Project Overview

Yozigo is a full-stack web application built using React, TypeScript, FastAPI, and PostgreSQL. It provides a movie ticket booking experience with authentication, seat selection, temporary seat holds, and Stripe payment integration.


## 2. Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- HTML and CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- JWT authentication
- Password hashing

### Database
- PostgreSQL

### Payment Integration
- Stripe Checkout
- Stripe payment verification and webhook handling

### Development and Deployment Tools
- Visual Studio Code
- Git and GitHub
- Postman
- Railway

## 3. Features

### Customer Features
- Customer registration and login
- Secure authentication
- Browse available movies
- View movie details and showtimes
- View the seat map for a selected show
- Select seats and hold them temporarily
- Validate seat availability before booking
- Proceed to Stripe Checkout
- View bookings and booking details

### Administrator Features
- Administrator authentication
- Movie management
- Show and showtime management
- Access to administrative pages
- Booking management functionality

### Backend Features
- REST API endpoints using FastAPI
- PostgreSQL database integration
- SQLAlchemy ORM
- JWT-based authentication
- Password hashing
- Temporary seat-hold handling
- Booking and payment-related endpoints
- Environment-based configuration

## 4. Project Structure

```text
Yozigo-Movie-Ticket-Booking/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── database.py
│   │   └── main.py
│   ├── uploads/
│   ├── requirements.txt
│   └── test_db.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

The exact files and directories may vary according to the implementation.

## 5. Prerequisites

Install the following software before running the application locally:

- Python 3.11 or another compatible Python version
- Node.js and npm
- PostgreSQL
- Git
- A Stripe account for payment testing

## 6. Local Setup and Installation

### Step 1: Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/Hariharanxdev/Yozigo-Movie-Ticket-Booking.git
cd Yozigo-Movie-Ticket-Booking
```

### Step 2: Create the PostgreSQL Database

Open PostgreSQL or the `psql` terminal and run:

```sql
CREATE DATABASE yozigo_db;
```

Ensure PostgreSQL is running and that you have valid database credentials.

### Step 3: Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the environment on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Alternatively, in Command Prompt:

```cmd
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

### Step 4: Configure Backend Environment Variables

Create a `.env` file inside the `backend` directory.

Example configuration:

```env
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/yozigo_db
SECRET_KEY=YOUR_SECRET_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
FRONTEND_URL=http://localhost:5173
```

Replace the example values with your actual local configuration. Use the environment variable names expected by the backend code.

Never commit database credentials, authentication secrets, or Stripe secret keys to GitHub.

### Step 5: Initialize the Database

Initialize the database using the application's database initialization process. If the backend creates tables automatically during startup, confirm that the expected tables are present in PostgreSQL.

### Step 6: Start the Backend Server

From the `backend` directory, run:

```bash
uvicorn app.main:app --reload
```

The backend should be available at:

http://127.0.0.1:8000

Open the FastAPI Swagger documentation to inspect the API endpoints:

http://127.0.0.1:8000/docs

### Step 7: Set Up the Frontend

Open a new terminal and navigate to the frontend directory from the project root:

```bash
cd frontend
```

Install the frontend dependencies:

```bash
npm install
```

Create a `.env` file inside the `frontend` directory.

For example, if the frontend uses `VITE_API_URL`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Use the actual environment variable name expected by the frontend code.

### Step 8: Start the Frontend

Run:

```bash
npm run dev
```

Open the local URL displayed in the terminal, usually:

http://localhost:5173

### Step 9: Build and Check the Frontend

Create a production build:

```bash
npm run build
```

Run the configured lint checks:

```bash
npm run lint
```

## 7. Test Account Details

Use the following accounts to test the application.

### Customer Account

- **Email:** `hari@gmail.com`
- **Password:** `Hariharan123`
- **Role:** Customer

The customer account can be used to explore customer-facing features such as movie browsing, show selection, seat selection, and the booking workflow.

### Admin Account

- **Email:** `admin@gmail.com`
- **Password:** `Admin@123`
- **Role:** Administrator

The administrator account can be used to access administrative features such as movie and show management.

Ensure both accounts exist in the deployed database and that the administrator account has the appropriate permissions.

## 8. Database Design

PostgreSQL is used to store customer accounts, movie details, showtimes, seat availability, bookings, and relationships between bookings and seats.

### Main Database Tables

| Table | Purpose |
|---|---|
| `users` | Stores customer and administrator account information |
| `movies` | Stores movie information |
| `shows` | Stores movie showtimes |
| `seats` | Stores seats and their availability for each show |
| `bookings` | Stores booking and associated payment information |
| `booking_seats` | Connects bookings with their selected seats |

### Database Relationships

```text
users
  |
  | One user can create multiple bookings
  v
bookings
  |
  | A booking can contain multiple seats
  v
booking_seats
  |
  | Associates bookings with seats
  v
seats
  |
  | Seats belong to a show
  v
shows
  |
  | Shows are associated with movies
  v
movies
```

### Seat Table Design

Seat records include fields such as:

- `id`
- `show_id`
- `seat_number`
- `row_label`
- `seat_label`
- `is_booked`
- `held_by_user_id`
- `hold_expires_at`
- `price`

The combination of `show_id` and `seat_number` is designed to be unique so that the same seat cannot be duplicated within a show.

## 9. Key Technical Decisions

1. **React and TypeScript:** Used to build a component-based frontend with type checking and reusable UI components.

2. **FastAPI:** Used to develop backend REST APIs and provide interactive API documentation through Swagger.

3. **PostgreSQL:** Used as the relational database for users, movies, shows, seats, and bookings.

4. **SQLAlchemy:** Used to map Python models to database tables and manage database operations.

5. **JWT authentication:** Used to authenticate users and protect authorized endpoints.

6. **Password hashing:** Passwords should be stored as hashes rather than plain text.

7. **Temporary seat holds:** Hold ownership and expiration timestamps help manage seats while customers complete the booking process.

8. **Double-booking prevention:** Backend validation, database constraints, and transaction handling help prevent multiple customers from booking the same seat.

9. **Stripe integration:** Stripe Checkout supports payment processing. Booking confirmation should depend on a verified payment result.

## 10. Project Milestones

### Milestone 1: Customer Sign Up and Log In
- Customer registration
- Customer login
- Secure authentication

### Milestone 2: Browse Movies and Shows
- Display available movies
- View movie details
- Browse available shows and showtimes

### Milestone 3: View the Seat Map
- Display seats for a selected show
- Show seat availability
- Select seats for booking

### Milestone 4: Select and Hold Seats
- Temporarily hold selected seats
- Associate holds with users
- Handle seat-hold expiration
- Prevent conflicting seat holds

### Milestone 5: Pay and Confirm a Booking
- Integrate Stripe Checkout
- Process payment outcomes
- Confirm bookings after payment verification

### Milestone 6: View My Bookings
- Display customer bookings
- View booking details
- Access booking information

### Milestone 7: Admin – Add Movies and Shows
- Provide administrative movie management
- Create and manage showtimes
- Restrict administrative operations to authorized users

### Milestone 8: Cancel a Booking
- Allow customers to cancel eligible bookings
- Update booking information after cancellation
- Handle seat availability according to cancellation rules

### Milestone 9: Admin – View Bookings per Show
- Display bookings associated with a selected show
- View relevant booking information
- Support administrative booking review

### Milestone 10: Live Seat Updates
- Refresh seat availability when changes occur
- Reflect booking and hold changes
- Help customers avoid selecting unavailable seats

## 11. Double-Booking Prevention

Preventing double booking is a key requirement for a movie ticket booking application.

The application should:

- Validate seat availability on the backend before accepting a hold or booking.
- Associate temporary holds with a user and an expiration time.
- Reject attempts to book seats already booked or actively held by another user.
- Use database constraints and transactions to protect against concurrent requests.
- Release expired holds so seats can become available again.
- Confirm bookings only after the payment result has been verified.

A useful concurrency test is to open two separate browser sessions and have both customers attempt to book the same seat for the same show. The backend should prevent both customers from successfully booking that seat.

## 12. Payment Integration

Yozigo uses Stripe Checkout for payment processing.

The payment workflow includes:

1. The customer selects a movie, show, and available seats.
2. The backend validates the selected seats.
3. The application creates the appropriate booking or payment session.
4. The customer proceeds to Stripe Checkout.
5. Stripe processes the payment.
6. The backend verifies the payment result and updates the booking.
7. The application displays the appropriate payment or booking information.

Use Stripe test mode during development. Test successful payments, cancellations, failed payments, and booking confirmation.

## 13. Deployment

The application is deployed using Railway.

### Frontend

https://yozigo.up.railway.app

### Backend

https://yozigo-movie-ticket-booking-production.up.railway.app
