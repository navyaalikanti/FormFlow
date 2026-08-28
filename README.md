# FormFlow

### Low-Code Dynamic Form Workflow & Data Collection Platform

FormFlow is a full-stack low-code platform that allows users to create dynamic forms, configure fields and validations, define conditional logic, publish forms, collect responses, manage form versions, and analyze submitted data through an interactive dashboard.

The platform simplifies the complete form lifecycle — from form creation to response analysis — without requiring users to write code.

---

## Features

### Form Builder

- Create and manage forms through a visual form builder
- Drag-and-drop field management
- Add, edit, delete, duplicate, and reorder fields
- Configure individual field properties
- Auto-save form changes
- Form preview

### Supported Field Types

- Short Text
- Long Text
- Number
- Email
- Phone
- URL
- Date
- Time
- Radio Button
- Checkbox
- Dropdown
- File Upload

### Field Configuration & Validation

Each field can be individually configured with:

- Label
- Description
- Placeholder
- Required / Optional
- Options for choice-based fields
- Field-specific validation rules
- Minimum and maximum values
- Minimum and maximum length
- File-related configuration

Validation ensures that submitted responses follow the configured form rules.

---

## Conditional Logic

FormFlow supports dynamic conditional logic that allows fields to be shown or hidden depending on previous responses.

Example:

    If "Are you a student?" = "Yes"
                    ↓
             Show "College Name"

This allows creators to build dynamic forms that adapt to respondent answers.

---

## Form Publishing

Forms can be managed through their publishing state.

    Draft → Published → Unpublished

Once a form is published, respondents can access it through the public form interface.

---

## Response Collection

FormFlow provides a complete response collection system.

When a respondent submits a form:

    Public Form
         ↓
    Form Validation
         ↓
    FastAPI API
         ↓
    Response Processing
         ↓
    PostgreSQL

Responses are stored along with their individual field answers.

The response system supports:

- Submission storage
- Individual response viewing
- Field-level answers
- Submission timestamps
- File upload information

---

## Response Dashboard

The dashboard provides a centralized interface for viewing collected responses.

Users can:

- View submissions
- Inspect individual responses
- Filter responses based on form fields
- Navigate between response data and analytics

### Field-Based Response Filtering

Responses can be filtered according to individual field values.

Example:

    Department = CSE

The dashboard can then display responses matching that condition.

---

## Analytics

FormFlow includes an analytics dashboard for understanding collected responses.

Analytics are generated dynamically from the fields and submitted responses.

The dashboard includes:

- Total response information
- Submission trends
- Field-level analytics
- Response distributions
- Choice-based analysis
- Checkbox analysis
- Suitable visualizations based on field types

Charts are rendered using Recharts.

The analytics system analyzes the actual fields present in a form rather than displaying only a generic response graph.

---

## Form Versioning

FormFlow supports version management for forms.

Different versions of a form can be maintained so that changes to the form structure can be tracked without losing the existing form configuration.

The database maintains form version information and version snapshots.

---

## File Uploads

FormFlow supports file-upload fields.

Uploaded files are managed using Supabase Storage, while relevant upload metadata is maintained with the application data.

Supabase bucket:

    formflow-files

---

## Multilingual Support

FormFlow includes multilingual support to make the application accessible to users across different languages.

The multilingual layer is integrated into the frontend application and supports the available languages in the application.

---

# Authentication

FormFlow uses JWT-based authentication for securing authenticated application workflows.

Authentication uses:

    JWT
    HS256 Algorithm
    Access Token Expiration

Access tokens maintain authenticated sessions between the frontend and backend.

---

# Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| React | Frontend application |
| Vite | Development and build tool |
| React Router | Application routing |
| Tailwind CSS | UI styling |
| Recharts | Analytics and data visualization |
| JavaScript / JSX | Frontend development |

## Backend

| Technology | Purpose |
|------------|---------|
| Python | Backend programming |
| FastAPI | REST API framework |
| Pydantic | Request/response validation |
| SQLAlchemy / SQLModel | Database ORM |
| Alembic | Database migrations |
| JWT | Authentication |

## Database & Storage

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary relational database |
| Neon | Hosted PostgreSQL database |
| Supabase Storage | File storage |

---

# System Architecture

<p align="center">
  <img src="docs/system-architecture.jpeg" alt="FormFlow System Architecture" width="100%">
</p>

# Database Structure

The application uses PostgreSQL with a relational schema designed around the form lifecycle.

Main entities:

    forms
    │
    ├── fields
    │   └── field_options
    │
    ├── conditional_logic
    │
    ├── responses
    │   └── response_answers
    │
    ├── form_versions
    │
    └── file_uploads

### Main Tables

### forms

Stores form information and configuration.

### fields

Stores fields belonging to each form.

### field_options

Stores options for radio buttons, checkboxes, and dropdowns.

### conditional_logic

Stores rules controlling dynamic field behavior.

### responses

Stores form submissions.

### response_answers

Stores answers corresponding to individual fields.

### form_versions

Stores different versions of forms.

### file_uploads

Stores information related to uploaded files.

PostgreSQL JSONB is used where flexible configuration and dynamic structured data are required.

---

# REST APIs

The backend exposes REST APIs through FastAPI.

The API layer covers the major application workflows.

### Form APIs

Used for:

- Creating forms
- Retrieving forms
- Updating forms
- Deleting forms
- Publishing forms
- Unpublishing forms

### Field APIs

Used for:

- Creating fields
- Retrieving fields
- Updating fields
- Deleting fields
- Managing field configuration

### Field Type APIs

Used to provide supported field types to the frontend.

### Conditional Logic APIs

Used for managing:

- Conditions
- Conditional rules
- Field visibility behavior

### Response APIs

Used for:

- Submitting responses
- Retrieving responses
- Retrieving individual response information
- Filtering response data

### Analytics APIs

Used to provide data required for:

- Submission trends
- Field-level analytics
- Response distributions
- Filtered analytics

### Version APIs

Used for managing and retrieving form versions.

### File Upload APIs

Used for handling file-upload functionality and associated metadata.

---

# API Documentation

FastAPI automatically provides interactive API documentation.

### Swagger UI

    http://localhost:8000/docs

### ReDoc

    http://localhost:8000/redoc

These interfaces can be used to explore and test the available REST APIs.

---

# Project Structure

    FormFlow/
    │
    ├── backend/
    │   ├── app/
    │   │   ├── api/
    │   │   ├── models/
    │   │   ├── schemas/
    │   │   ├── services/
    │   │   ├── crud/
    │   │   ├── database/
    │   │   └── main.py
    │   │
    │   ├── alembic/
    │   │   └── versions/
    │   │
    │   ├── requirements.txt
    │   └── .env
    │
    ├── frontend/
    │   ├── src/
    │   │   ├── components/
    │   │   ├── pages/
    │   │   ├── services/
    │   │   ├── hooks/
    │   │   └── utils/
    │   │
    │   ├── public/
    │   ├── package.json
    │   └── vite.config.js
    │
    └── README.md

---

# Environment Configuration

Create a `.env` file in the backend.

Do not commit actual credentials or secrets to GitHub.

    DATABASE_URL=your_neon_postgresql_connection_string

    JWT_SECRET_KEY=your_jwt_secret
    JWT_ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=1440

    CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080

    SUPABASE_URL=your_supabase_project_url
    SUPABASE_SECRET_KEY=your_supabase_secret_key
    SUPABASE_BUCKET=formflow-files

---

# Installation & Setup

## 1. Clone the Repository

    git clone <repository-url>
    cd FormFlow

## 2. Backend Setup

    cd backend

    python -m venv venv

### Windows

    venv\Scripts\activate

### Linux / macOS

    source venv/bin/activate

Install dependencies:

    pip install -r requirements.txt

Configure the `.env` file and run database migrations:

    alembic upgrade head

Start the FastAPI server:

    uvicorn app.main:app --reload

Backend:

    http://localhost:8000

---

## 3. Frontend Setup

Open another terminal:

    cd frontend

    npm install

    npm run dev

Frontend:

    http://localhost:5173

---

# Application Workflow

## 1. Create

    Dashboard
        ↓
    Create Form
        ↓
    Add Fields

## 2. Configure

    Configure Fields
           ↓
    Validation
           ↓
    Conditional Logic
           ↓
    Auto-Save

## 3. Publish

    Form Ready
        ↓
    Publish
        ↓
    Public Form

## 4. Collect

    Respondent
        ↓
    Fill Form
        ↓
    Validation
        ↓
    Submit
        ↓
    PostgreSQL

## 5. Analyze

    Responses
        ↓
    Response Filtering
        ↓
    Analytics Processing
        ↓
    Field-Level Charts
        ↓
    Analytics Dashboard

---

# Why FormFlow?

FormFlow combines the complete form workflow into a single platform:

    Create
       ↓
    Configure
       ↓
    Validate
       ↓
    Add Conditional Logic
       ↓
    Publish
       ↓
    Collect Responses
       ↓
    Filter Responses
       ↓
    Analyze Data

Instead of being limited to basic form creation, FormFlow provides a dynamic form-building environment together with response management and field-level analytics.

---

# Project Status

Status: Completed

Implemented functionality includes:

- Dynamic form creation
- Drag-and-drop form builder
- Multiple field types
- Field configuration
- Validation
- Conditional logic
- Auto-save
- Form publishing
- JWT authentication
- Response collection
- Response management
- Field-based response filtering
- Analytics dashboard
- Field-level analytics
- Form versioning
- File uploads
- Supabase Storage
- Multilingual support
- REST APIs
- PostgreSQL database

---

# Built With

Frontend:
React • Vite • Tailwind CSS • React Router • Recharts

Backend:
Python • FastAPI • Pydantic • SQLAlchemy / SQLModel • Alembic

Database:
PostgreSQL • Neon

Storage:
Supabase Storage

Authentication:
JWT
