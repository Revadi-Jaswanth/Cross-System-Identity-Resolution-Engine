# Developer Setup Guide

This document outlines the step-by-step instructions required to set up the local development environment for VeriSync.

---

## Prerequisites

- **Python**: Version 3.11 or later
- **Node.js**: Version 18.x or later (includes `npm`)
- **Database**: MySQL Server 8.0 or later
- **Containerization** (Optional): Docker & Docker Compose

---

## 1. Database Setup

1. Start your local MySQL server instance.
2. Open your preferred database tool or terminal client and execute the database schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
3. Load the testing validation datasets (optional):
   ```bash
   mysql -u root -p -D identity_resolution < database/seeds.sql
   ```

---

## 2. Backend Service Installation

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Initialize a Python virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
4. Install all python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
6. Populate the secrets inside backend `.env` (refer to the documentation).

---

## 3. Frontend Installation

1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install all node packages:
   ```bash
   npm install
   ```
3. Copy the frontend environment configuration:
   ```bash
   cp .env.example .env
   ```

---

## 4. Run Locally

### Run Backend
```bash
cd backend
python run.py
```
- The API will start on: `http://127.0.0.1:5000`

### Run Frontend
```bash
cd frontend
npm run dev
```
- The React SPA will open on: `http://localhost:5173`

---

## 5. Run via Docker Compose

To spin up the database, Flask application server, and React client on container nodes, run from the root:

```bash
docker-compose -f docker/docker-compose.yml up --build
```
- React Frontend: `http://localhost`
- Flask API Backend: `http://localhost:5000`
- MySQL Database Port: `3306`
