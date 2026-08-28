from app.database.session import SessionLocal
from app.models.form_platform import Form, Field, FormVersion
from sqlalchemy.orm import selectinload

db = SessionLocal()
form = db.query(Form).filter(Form.status == "published").first()

if form:
    print(f"Form ID: {form.id}")
    for section in form.sections:
        print(f"Section {section.id} order {section.section_order}")
        for field in section.fields:
            print(f"  Field {field.field_key} id {field.id} sort_order {field.sort_order}")
            
    version = form.published_version
    if version:
        print("SNAPSHOT:")
        for sec in version.snapshot.get("sections", []):
            print(f"Section {sec.get('id')} order {sec.get('section_order')}")
            for fld in sec.get("fields", []):
                print(f"  Field {fld.get('field_key')} id {fld.get('id')} sort_order {fld.get('sort_order')}")

db.close()
