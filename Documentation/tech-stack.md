# Tech Stack

## Overview
This document outlines the technologies used in the GameSetAI project, including the frontend, backend, database, AI/ML, and deployment tools.

---

## Frontend
### Framework
- **React.js**: A JavaScript library for building user interfaces.
- **TypeScript**: Adds static typing to JavaScript for better code quality and developer experience.

### Styling
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **Material-UI**: A React component library for pre-designed UI elements (optional alternative to Tailwind CSS).

### State Management
- **React Hooks**: `useState`, `useEffect`, and `useContext` for managing component state.

### Routing
- **React Router**: For handling client-side routing.

### API Communication
- **Axios**: A promise-based HTTP client for making API calls.

### Testing
- **Jest**: A JavaScript testing framework.
- **React Testing Library**: For testing React components.
- **Cypress**: For end-to-end testing.

---

## Backend
### Framework
- **Node.js**: A JavaScript runtime for building scalable server-side applications.
- **Express.js**: A web framework for Node.js.

### API Design
- **RESTful APIs**: Follow REST principles for clean and predictable endpoints.
- **JSON**: Use JSON for request/response payloads.

### Authentication
- **JWT (JSON Web Tokens)**: For user authentication and session management.

### Database Integration
- **Supabase**: A PostgreSQL-based database with built-in authentication and real-time capabilities.

### Testing
- **Jest**: For unit and integration testing.
- **Supertest**: For testing API endpoints.

---

## Database
### Primary Database
- **Supabase (PostgreSQL)**: A relational database with support for advanced queries and scalability.

### Schema Design
- **Users Table**:
  - `userId`: Primary key.
  - `email`: User email.
  - `passwordHash`: Hashed password.
  - `profileInfo`: JSON object for additional user details.
- **Matches Table**:
  - `matchId`: Primary key.
  - `userId`: Foreign key linking to the Users table.
  - `videoUrl`: URL of the uploaded video.
  - `stats`: JSON object for match statistics (future feature).
  - `patterns`: JSON object for AI insights (future feature).

### Migrations
- Use Supabase’s migration tools to manage schema changes.

---

## AI/ML
### Libraries
- **Python**: The primary programming language for AI/ML development.
- **OpenCV**: For video processing (e.g., detecting key events in tennis matches).
- **TensorFlow**: For machine learning tasks (e.g., pattern recognition, shot analysis).

### Hosting
- **Local Scripts**: Initially, AI/ML scripts will run locally.
- **Future**: Migrate to cloud services like AWS SageMaker or Google AI Platform.

---

## Deployment
### Frontend Hosting
- **Vercel**: A platform for deploying React apps with built-in CI/CD.

### Backend Hosting
- **Heroku**: Initially, for easy deployment and scalability.
- **Future**: Migrate to AWS (Elastic Beanstalk, EC2) or Google Cloud (App Engine, Compute Engine).

### Containerization
- **Docker**: For packaging the app and its dependencies into containers.
- **Docker Compose**: For managing multi-container setups (e.g., backend + database).

### CI/CD
- **GitHub Actions**: For automating testing and deployment workflows.
- **Environment Variables**: Store sensitive data (e.g., API keys, database URLs) in `.env` files.

---

## Development Environment Setup
### Prerequisites
- **Node.js**: Install the latest LTS version.
- **Python**: Install Python 3.8 or later.
- **Docker**: Install Docker for containerization.