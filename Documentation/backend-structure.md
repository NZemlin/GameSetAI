# Backend Structure

## Overview
This document outlines the structure and architecture of the GameSetAI backend, including user authentication, database schema, API endpoints, and security measures.

---

## Technologies
- **Framework**: Node.js with Express.js.
- **Database**: Supabase (PostgreSQL).
- **Authentication**: JWT (JSON Web Tokens).
- **API Design**: RESTful APIs with JSON payloads.

---

## File Structure
### High-Level Structure
- **`/server`**: Contains all backend source code.
  - **`/controllers`**: Handles request logic (e.g., user, video controllers).
  - **`/models`**: Database models (e.g., User, Match).
  - **`/routes`**: API routes.
  - **`/services`**: Business logic (e.g., video processing).
  - **`/utils`**: Helper functions (e.g., authentication, file upload).
  
---

## Database Schema
### Users Table
- **`userId`**: Primary key (UUID).
- **`email`**: User email (unique).
- **`passwordHash`**: Hashed password.
- **`profileInfo`**: JSON object for additional user details (e.g., name, profile picture).

### Matches Table
- **`matchId`**: Primary key (UUID).
- **`userId`**: Foreign key linking to the Users table.
- **`videoUrl`**: URL of the uploaded video.
- **`stats`**: JSON object for match statistics (future feature).
- **`patterns`**: JSON object for AI insights (future feature).

---

## API Endpoints
### User Endpoints
- **POST `/api/users/signup`**: Create a new user.
  - Request Body: `{ email, password }`
  - Response: `{ userId, email }`
- **POST `/api/users/login`**: Log in a user.
  - Request Body: `{ email, password }`
  - Response: `{ token, userId }`
- **GET `/api/users/profile`**: Get user profile.
  - Response: `{ userId, email, profileInfo }`
- **PUT `/api/users/profile`**: Update user profile.
  - Request Body: `{ email, password, profileInfo }`
  - Response: `{ userId, email, profileInfo }`

### Video Endpoints
- **POST `/api/videos/upload`**: Upload a match video.
  - Request Body: `{ file, metadata }`
  - Response: `{ videoId, videoUrl }`
- **GET `/api/videos/:videoId`**: Get video details.
  - Response: `{ videoId, videoUrl, stats, patterns }`
- **PUT `/api/videos/:videoId/edit`**: Edit a video.
  - Request Body: `{ edits }`
  - Response: `{ videoId, videoUrl }`
- **DELETE `/api/videos/:videoId`**: Delete a video.
  - Response: `{ message: "Video deleted" }`

---

## Authentication
### JWT (JSON Web Tokens)
- **Signup**: Generate a JWT when a user signs up.
- **Login**: Verify user credentials and generate a JWT.
- **Middleware**: Use JWT middleware to protect routes (e.g., `/api/videos`).

### Password Hashing
- Use **bcrypt** to hash passwords before storing them in the database.

---

## Security Measures
### Environment Variables
- Store sensitive data (e.g., database URLs, API keys) in `.env` files.
- Use `dotenv` to load environment variables in development.

### Input Validation
- Validate all user inputs to prevent SQL injection and other attacks.
- Use libraries like `joi` or `express-validator`.

### Rate Limiting
- Use `express-rate-limit` to limit the number of requests from a single IP address.

---

## Error Handling
### Global Error Handler
- Use Express.js middleware to catch and handle errors globally.
- Log errors with sufficient context for debugging.

### Custom Error Classes
- Create custom error classes (e.g., `NotFoundError`, `ValidationError`) for better error handling.

---

## Testing
### Unit Tests
- Write unit tests for controllers and services using Jest.

### Integration Tests
- Test API endpoints using Supertest.