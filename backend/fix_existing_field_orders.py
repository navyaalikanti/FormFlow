"""Script to normalize section_order and sort_order across all existing forms and update snapshots in the DB."""
import copy
from app.database.session import SessionLocal
from app.models.form_platform import Form, FormVersion
from sqlalchemy import select

def fix_all():
    db = SessionLocal()
    try:
        forms = list(db.scalars(select(Form)).all())
        print(f"Normalizing field orders for {len(forms)} form(s)...")

        for form in forms:
            # Sort sections by section_order and id
            sorted_sections = sorted(
                form.sections,
                key=lambda s: (s.section_order if s.section_order is not None else 0, str(s.id) if s.id else "")
            )
            for s_idx, section in enumerate(sorted_sections):
                section.section_order = s_idx
                sorted_fields = sorted(
                    section.fields,
                    key=lambda f: (f.sort_order if f.sort_order is not None else 0, str(f.id) if f.id else "")
                )
                for f_idx, field in enumerate(sorted_fields):
                    field.sort_order = f_idx
                    sorted_options = sorted(
                        field.options,
                        key=lambda o: (o.sort_order if o.sort_order is not None else 0, str(o.id) if o.id else "")
                    )
                    for o_idx, option in enumerate(sorted_options):
                        option.sort_order = o_idx

        db.flush()

        # Update versions/snapshots to ensure every section/field has "id" and proper order
        versions = list(db.scalars(select(FormVersion)).all())
        print(f"Updating snapshots for {len(versions)} version(s)...")

        for version in versions:
            if not version.snapshot:
                continue
            snapshot = copy.deepcopy(version.snapshot)
            sections_data = snapshot.get("sections", [])
            for s_idx, sec in enumerate(sections_data):
                if "section_order" not in sec or sec["section_order"] is None:
                    sec["section_order"] = s_idx
                fields_data = sec.get("fields", [])
                for f_idx, fld in enumerate(fields_data):
                    if "sort_order" not in fld or fld["sort_order"] is None:
                        fld["sort_order"] = f_idx
            
            version.snapshot = snapshot

        db.commit()
        print("Successfully normalized database field orders and form version snapshots!")

    except Exception as e:
        db.rollback()
        print(f"Error fixing field orders: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_all()
