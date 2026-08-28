import uuid
from app.database.session import SessionLocal
from app.models.admin import Admin
from app.models.form_platform import Form
from app.services.form_service import FormService

db = SessionLocal()
admin = db.query(Admin).first()
form = db.query(Form).first()

if form and admin:
    print(f"Testing publishing for Form {form.id} - '{form.title}'")
    try:
        updated_form, version = FormService.publish_form(db, admin, form.id)
        print("Publish successful! Version Number:", version.version_number)
        print("Snapshot Sections:")
        for sec in version.snapshot.get("sections", []):
            print(f" Section '{sec.get('title')}' id={sec.get('id')} order={sec.get('section_order')}")
            for fld in sec.get("fields", []):
                print(f"   Field '{fld.get('label')}' key={fld.get('field_key')} id={fld.get('id')} sort_order={fld.get('sort_order')}")
    except Exception as e:
        print("Publish error:", e)

db.close()
