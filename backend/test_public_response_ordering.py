from app.database.session import SessionLocal
from app.models.form_platform import Form
from app.services.submission_service import SubmissionService

db = SessionLocal()
form = db.query(Form).filter(Form.status == "published").first()

if form:
    print(f"Testing public form response for token: {form.share_token}")
    try:
        public_resp = SubmissionService.build_public_form_response(db, form.share_token)
        print("Public Form Title:", public_resp.title)
        for sec in public_resp.sections:
            print(f" Section: '{sec.title}' id={sec.id} order={sec.section_order}")
            for fld in sec.fields:
                print(f"   Field: '{fld.label}' key={fld.field_key} id={fld.id} sort_order={fld.sort_order}")
    except Exception as e:
        print("Error:", e)

db.close()
