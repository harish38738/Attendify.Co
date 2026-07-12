# Installation Guide — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Compiled dependency steps, env vars, and setup guides. | Lead Operations Engineer |

---

## Source Traceability

| Installation Step | Primary Code Source | Verification Target |
|---|---|---|
| **Prerequisites** | `Backened/requirements.txt`, `Frontend/package.json` | System runtime engines |
| **Backend Setup** | `Backened/requirements.txt`, `Backened/server.py` | Virtual environment & libraries |
| **Env configuration** | `Backened/.env` | Env parser in `server.py` |
| **Frontend Setup** | `Frontend/package.json` | npm dependency tree resolution |
| **Smoke Verification** | `Backened/server.py` | API status checks |

---

## Table of Contents
1. [System Requirements & Prerequisites](#1-system-requirements--prerequisites)
2. [Backend Installation & Setup](#2-backend-installation--setup)
3. [Frontend Installation & Setup](#3-frontend-installation--setup)
4. [Initial Run & Smoke Verification](#4-initial-run--smoke-verification)

---

## 1. System Requirements & Prerequisites

To run Attendify V1 locally or in a single-node host environment, the following runtimes must be installed:

### 1.1 Development Engines
* **Python**: `3.10` or higher (mandatory for `motor` dynamic driver dependencies).
* **Node.js**: `18.x` or higher (LTS recommended).
* **npm**: `9.x` or higher.
* **MongoDB**: `6.0` or higher (Local Community Server or MongoDB Atlas instance).

---

## 2. Backend Installation & Setup

### 2.1 Virtual Environment Provisioning
Navigate to the backend directory and establish a localized Python environment:
```bash
# Navigate to Backend
cd Backened

# Provision virtual environment
python -m venv venv
```

**Platform-Specific Virtual Environment Activation:**

* **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
* **Windows (Command Prompt / CMD)**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```
* **macOS / Linux (Bash or Zsh)**:
  ```bash
  source venv/bin/activate
  ```

### 2.2 Dependency Installation
Ensure Python's package installer is upgraded in the active virtual environment, then install requirements:
* **Windows (PowerShell/CMD)**:
  ```cmd
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  ```
* **macOS / Linux (Bash/Zsh)**:
  ```bash
  python3 -m pip install --upgrade pip
  pip3 install -r requirements.txt
  ```

### 2.3 Environment Variable Setup
Create a `.env` file in the root of the `Backened/` directory. Fill in the following key-value pairs (do not commit this file to version control):
```ini
MONGO_URL=mongodb://localhost:27017
DB_NAME=attendify
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
OWNER_EMAIL=harishragavkumars@gmail.com
APPROVED_ADMINS=harishragavkumars@gmail.com,harish@gmail.com
```

---

## 3. Frontend Installation & Setup

### 3.1 Package Resolution
Navigate to the frontend directory and retrieve package nodes:
```powershell
# Navigate to Frontend
cd ..\Frontend

# Install node dependencies
npm install
```

### 3.2 Frontend Env Setup
Create a `.env` file in the root of the `Frontend/` directory:
```ini
VITE_API_URL=http://localhost:8000
```

---

## 4. Initial Run & Smoke Verification

### 4.1 Launch Backend
In an active virtual environment window, start the FastAPI monolithic server:
```powershell
cd Backened
python server.py
```
* **Expected Log Output**:
  ```text
  INFO:server:Approved admin emails seeded: 2; owner=harishragavkumars@gmail.com
  INFO:server:Indexes ensured
  INFO:uvicorn.error:Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
  ```

### 4.2 Run Health Verification
Verify backend system connectivity using platform-appropriate calls:

* **Windows (PowerShell)**:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:8000/api/health" -Method Get
  ```
* **macOS / Linux / Windows CMD (Curl)**:
  ```bash
  curl -X GET http://localhost:8000/api/health
  ```

* **Expected Payload**:
  ```json
  {
    "success": true,
    "message": "Healthy",
    "data": {
      "status": "healthy",
      "database": "connected"
    }
  }
  ```

### 4.3 Launch Frontend
In a separate terminal window, launch the React development server:
```powershell
cd Frontend
npm run dev
```
* Navigate to `http://localhost:3000` to verify the "Your Smart Academic Companion" landing portal screen appears.
