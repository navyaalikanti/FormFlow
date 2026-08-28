# FormFlow - Advanced Form Builder and Management Platform

FormFlow is a production-ready web application containing a FastAPI backend and a React (Vite) frontend. This repository is pre-configured with Docker support for fast development and deployment.

---

## Architecture Overview

- **Backend**: FastAPI (Python 3.10) with Alembic for database migrations, SQLAlchemy ORM, and integrations with PostgreSQL and Supabase.
- **Frontend**: React (Vite) styled with Tailwind CSS, utilizing React Router and Lucide Icons.
- **Database**: PostgreSQL (by default configured with Neon tech server).
- **Storage**: Supabase Storage Buckets.

---

## Deployment & Setup

### Option 1: Deploy with Docker (Recommended)

Make sure you have [Docker](https://www.docker.com/) and Docker Compose installed.

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/navyaalikanti/FormFlow.git
   cd FormFlow
   ```

2. **Configure Environment Variables**:
   Copy the example environment file at the root:
   ```bash
   copy .env.example .env
   ```
   Modify `.env` to configure your PostgreSQL URL, Supabase secret keys, and JWT settings as needed.

3. **Start the Platform**:
   Build and start all containers using Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

   This command will:
   - Run the database migrations automatically.
   - Start the backend on `http://localhost:8000`.
   - Start the frontend on `http://localhost:80` (accessible via `http://localhost`).

4. **Shutdown services**:
   ```bash
   docker-compose down
   ```

### Option 2: Running Locally (Non-Docker)

#### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure `.env`:
   ```bash
   copy .env.example .env
   ```
5. Run migrations and start the backend:
   ```bash
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

#### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env`:
   ```bash
   copy .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
