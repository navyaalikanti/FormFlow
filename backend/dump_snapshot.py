import json
from app.database.session import SessionLocal
from app.models.form_platform import FormVersion
from sqlalchemy import select

db = SessionLocal()
version = db.execute(select(FormVersion).limit(1)).scalar_one_or_none()
if version:
    print(json.dumps(version.snapshot, indent=2))
db.close()
