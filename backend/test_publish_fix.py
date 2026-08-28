#!/usr/bin/env python
"""Quick test to verify the publish workflow works after fixing the query error."""
import sys
sys.path.insert(0, '.')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.admin import Admin
from app.models.form_platform import Field, FieldOption, Form, Section
from app.services.form_service import FormService


def _make_session():
    """Create an in-memory SQLite session for testing."""
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_publish_workflow():
    """Test the complete publish workflow to verify the query fix works."""
    session = _make_session()
    
    # Create admin
    admin = Admin(name="Test Admin", email="admin@example.com", password_hash="hash")
    session.add(admin)
    session.commit()
    session.refresh(admin)
    
    # Create form with sections and fields
    form = Form(
        owner_admin_id=admin.id,
        title="Test Form",
        description="Test form for publishing",
        status="draft",
        public_slug="test-form",
        share_token="test-token",
        settings={},
        theme_config={},
        analytics_config={},
        ai_config={},
    )
    
    # Create sections
    section1 = Section(
        form_id=form.id,
        title="Section 1",
        description="First section",
        section_order=0,
        is_collapsible=False,
    )
    
    section2 = Section(
        form_id=form.id,
        title="Section 2",
        description="Second section",
        section_order=1,
        is_collapsible=False,
    )
    
    # Add fields to section 1
    field1 = Field(
        form_id=form.id,
        section=section1,
        field_key="name",
        label="Name",
        field_type="short_text",
        sort_order=0,
    )
    
    field2 = Field(
        form_id=form.id,
        section=section1,
        field_key="email",
        label="Email",
        field_type="email",
        sort_order=1,
    )
    
    section1.fields.extend([field1, field2])
    
    # Add field to section 2
    field3 = Field(
        form_id=form.id,
        section=section2,
        field_key="phone",
        label="Phone",
        field_type="phone",
        sort_order=0,
    )
    
    section2.fields.append(field3)
    
    form.sections.extend([section1, section2])
    session.add(form)
    session.commit()
    session.refresh(form)
    
    print(f"✓ Created form with ID: {form.id}")
    
    # Step 1: Get form (should work without query error)
    try:
        retrieved_form = FormService.get_form(session, admin, form.id)
        print(f"✓ Step 1: Retrieved form successfully")
        print(f"  - Sections: {len(retrieved_form.sections)}")
        print(f"  - Section 1 fields: {len(retrieved_form.sections[0].fields)}")
        print(f"  - Section 2 fields: {len(retrieved_form.sections[1].fields)}")
    except Exception as e:
        print(f"✗ Step 1 FAILED: {e}")
        return False
    
    # Step 2: Publish the form
    try:
        published_form, version = FormService.publish_form(session, admin, form.id)
        print(f"✓ Step 2: Published form successfully")
        print(f"  - Version number: {version.version_number}")
        print(f"  - Status: {published_form.status}")
        print(f"  - Published version ID: {version.id}")
    except Exception as e:
        print(f"✗ Step 2 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 3: Verify published form has correct structure
    try:
        form_response = FormService.get_form(session, admin, published_form.id)
        print(f"✓ Step 3: Retrieved published form")
        print(f"  - Status: {form_response.status}")
        print(f"  - Sections in response: {len(form_response.sections)}")
        
        # Verify field order is preserved
        section1_labels = [f.label for f in form_response.sections[0].fields]
        section2_labels = [f.label for f in form_response.sections[1].fields]
        print(f"  - Section 1 field order: {section1_labels}")
        print(f"  - Section 2 field order: {section2_labels}")
        
        if section1_labels != ["Name", "Email"]:
            print(f"✗ Section 1 field order incorrect!")
            return False
        if section2_labels != ["Phone"]:
            print(f"✗ Section 2 field order incorrect!")
            return False
            
    except Exception as e:
        print(f"✗ Step 3 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 4: Test edit as new draft
    try:
        draft = FormService.edit_as_new_draft(session, admin, published_form.id)
        print(f"✓ Step 4: Created new draft successfully")
        print(f"  - Draft status: {draft.status}")
    except Exception as e:
        print(f"✗ Step 4 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 5: Verify list_forms works
    try:
        forms_list = FormService.list_forms(session, admin)
        print(f"✓ Step 5: Listed forms successfully")
        print(f"  - Total forms: {len(forms_list)}")
    except Exception as e:
        print(f"✗ Step 5 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n✅ All publish workflow tests PASSED!")
    return True


if __name__ == "__main__":
    success = test_publish_workflow()
    sys.exit(0 if success else 1)
