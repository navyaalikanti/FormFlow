from app.database.session import SessionLocal
from app.models.form_platform import Form, Field, FormVersion
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT id, field_key, sort_order FROM fields ORDER BY sort_order")).fetchall()
print("All fields in DB:")
for r in res:
    print(r)

db.close()
