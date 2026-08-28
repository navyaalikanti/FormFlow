# FormFlow Backend

## Run

```bash
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/forms`
- `GET /api/forms`
- `GET /api/forms/{id}`
- `PUT /api/forms/{id}`
- `DELETE /api/forms/{id}`
- `POST /api/forms/{id}/duplicate`
- `POST /api/forms/{id}/publish`
- `POST /api/forms/{id}/unpublish`
- `POST /api/forms/{id}/archive`
- `POST /api/forms/{id}/restore`
- `GET /api/health`
