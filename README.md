# Pragalbh Services 2.0

A full-stack web application featuring a modern React frontend and a robust Node.js backend.

## Project Structure

This repository contains both the frontend and backend of the application:

- `Frontend/`: React application built with Vite, TailwindCSS, and Framer Motion.
- `Backend/`: Express/Node.js REST API with TypeScript, MongoDB (Mongoose), JWT authentication, and Google AI/Translate integrations.

## Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB instance (local or Atlas)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Backend` directory and add your environment variables (e.g., `PORT`, `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, etc.).
4. Start the development server:
   ```bash
   npm run dev
   ```
   *(Note: You can also seed initial data by running `npm run seed`)*

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `Frontend` directory for any necessary frontend environment variables (like the backend API URL).
4. Start the development server:
   ```bash
   npm run dev
   ```

## Tech Stack

### Frontend
- React 19
- Vite
- TailwindCSS
- Framer Motion
- React Router DOM
- Lucide React

### Backend
- Node.js
- Express
- TypeScript
- MongoDB & Mongoose
- JSON Web Token (JWT)
- Google Generative AI
- Google Translate API
