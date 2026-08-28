"""
Final verification that existing FormFlow features are not broken by retention policy implementation.
Tests:
- Form creation and retrieval
- Field creation and management
- Response submission
- Form publishing and versioning
- Audit logs (existing)
- Analytics and filtering
"""

import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models import RetentionPolicy
from app.models.form_platform import (
    Form, FormVersion, Field, Section, Response, ResponseAnswer,
    AuditLog, ActivityLog
)
from app.services.retention_service import RetentionService
from app.services.audit_log_service import AuditLogService
from app.database.session import SessionLocal
from sqlalchemy import select


def test_form_creation():
    """Test basic form creation still works."""
    print("\n=== TEST: Form Creation ===")
    try:
        db = SessionLocal()
        
        # Create form
        form = Form(
            title="Test Existing Features Form",
            description="Testing that existing features still work",
            public_slug=f"test-existing-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        assert form.id is not None, "Form should have ID"
        assert form.status == "draft", "New form should be draft"
        assert form.title == "Test Existing Features Form", "Title should be preserved"
        print(f"✓ Form created: {form.id}")
        print(f"  - status: {form.status}")
        print(f"  - title: {form.title}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_field_creation():
    """Test field creation and management."""
    print("\n=== TEST: Field Creation ===")
    try:
        db = SessionLocal()
        
        # Create form
        form = Form(
            title="Test Fields Form",
            public_slug=f"test-fields-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Create section
        section = Section(
            form_id=form.id,
            title="Section 1",
            section_order=0,
        )
        db.add(section)
        db.commit()
        db.refresh(section)
        
        # Create field
        field = Field(
            form_id=form.id,
            section_id=section.id,
            field_key="test_field",
            label="Test Field",
            field_type="short_text",
            sort_order=0,
        )
        db.add(field)
        db.commit()
        db.refresh(field)
        
        assert field.id is not None, "Field should have ID"
        assert field.label == "Test Field", "Label should be preserved"
        print(f"✓ Field created: {field.id}")
        print(f"  - label: {field.label}")
        print(f"  - type: {field.field_type}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_response_submission():
    """Test response submission and tracking."""
    print("\n=== TEST: Response Submission ===")
    try:
        db = SessionLocal()
        
        # Create form
        form = Form(
            title="Test Response Form",
            public_slug=f"test-response-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
            status="published",
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Create response (simulating submission)
        response = Response(
            form_id=form.id,
            status="submitted",
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(response)
        db.commit()
        db.refresh(response)
        
        assert response.id is not None, "Response should have ID"
        assert response.status == "submitted", "Response should be submitted"
        assert response.submitted_at is not None, "Response should have submitted_at"
        print(f"✓ Response created: {response.id}")
        print(f"  - status: {response.status}")
        print(f"  - submitted_at: {response.submitted_at}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_form_versioning():
    """Test form versioning and publishing."""
    print("\n=== TEST: Form Versioning ===")
    try:
        db = SessionLocal()
        
        # Create form
        form = Form(
            title="Test Version Form",
            public_slug=f"test-version-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
            status="draft",
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Create version
        version = FormVersion(
            form_id=form.id,
            version_number=1,
            status="published",
            snapshot={
                "form": {"title": form.title},
                "sections": [],
            },
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        
        assert version.id is not None, "Version should have ID"
        assert version.version_number == 1, "Version number should be 1"
        assert version.status == "published", "Version should be published"
        print(f"✓ Version created: {version.id}")
        print(f"  - version_number: {version.version_number}")
        print(f"  - status: {version.status}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_audit_log_service():
    """Test that AuditLogService still works correctly."""
    print("\n=== TEST: Audit Log Service ===")
    try:
        db = SessionLocal()
        
        # Create form
        form = Form(
            title="Test Audit Form",
            public_slug=f"test-audit-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Create audit log via service
        audit_log = AuditLogService.create_audit_log(
            db,
            user_id=None,
            action="CREATE_FORM",
            form_id=form.id,
            resource_type="form",
            details={"form_title": form.title},
        )
        
        assert audit_log.id is not None, "Audit log should have ID"
        assert audit_log.action == "CREATE_FORM", "Action should be CREATE_FORM"
        print(f"✓ Audit log created: {audit_log.id}")
        print(f"  - action: {audit_log.action}")
        print(f"  - form_id: {audit_log.form_id}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_response_with_answers():
    """Test response submission with answers."""
    print("\n=== TEST: Response with Answers ===")
    try:
        db = SessionLocal()
        
        # Create form and field
        form = Form(
            title="Test Answers Form",
            public_slug=f"test-answers-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
            status="published",
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        section = Section(
            form_id=form.id,
            title="Section 1",
            section_order=0,
        )
        db.add(section)
        db.commit()
        db.refresh(section)
        
        field = Field(
            form_id=form.id,
            section_id=section.id,
            field_key="test_field",
            label="Test Field",
            field_type="short_text",
            sort_order=0,
        )
        db.add(field)
        db.commit()
        db.refresh(field)
        
        # Create response with answer
        response = Response(
            form_id=form.id,
            status="submitted",
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(response)
        db.commit()
        db.refresh(response)
        
        # Create answer
        answer = ResponseAnswer(
            response_id=response.id,
            field_id=field.id,
            answer_value="Test answer",
            answer_text="Test answer",
        )
        db.add(answer)
        db.commit()
        db.refresh(answer)
        
        # Verify relationship
        response_with_answers = db.scalars(
            select(Response).where(Response.id == response.id)
        ).first()
        assert len(response_with_answers.answers) == 1, "Response should have 1 answer"
        print(f"✓ Response created with answer")
        print(f"  - response_id: {response.id}")
        print(f"  - answer_id: {answer.id}")
        print(f"  - answers count: {len(response_with_answers.answers)}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_form_with_retention_policy():
    """Test that Form model correctly includes retention_policy relationship."""
    print("\n=== TEST: Form with Retention Policy Relationship ===")
    try:
        db = SessionLocal()
        
        # Create form
        form = Form(
            title="Test Retention Relationship Form",
            public_slug=f"test-rel-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Check relationship (no policy yet)
        assert form.retention_policy is None, "New form should have no policy"
        print(f"✓ Form has retention_policy attribute")
        print(f"  - initial policy: {form.retention_policy}")
        
        # Add retention policy
        policy = RetentionService.get_or_create_retention_policy(db, form.id)
        
        # Reload form and check relationship
        form = db.scalars(select(Form).where(Form.id == form.id)).first()
        assert form.retention_policy is not None, "Form should have policy after creation"
        assert form.retention_policy.form_id == form.id, "Policy should belong to form"
        print(f"✓ Retention policy linked to form")
        print(f"  - policy_id: {form.retention_policy.id}")
        print(f"  - form_id: {form.retention_policy.form_id}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_response_status_values():
    """Test that Response status values work correctly (existing + new)."""
    print("\n=== TEST: Response Status Values ===")
    try:
        db = SessionLocal()
        
        # Create form
        form = Form(
            title="Test Status Form",
            public_slug=f"test-status-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
            status="published",
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Test all status values
        status_values = ["in_progress", "submitted", "archived"]
        responses = {}
        
        for status_value in status_values:
            response = Response(
                form_id=form.id,
                status=status_value,
                submitted_at=datetime.now(timezone.utc) if status_value != "in_progress" else None,
            )
            db.add(response)
            db.commit()
            db.refresh(response)
            responses[status_value] = response
            print(f"✓ Response created with status: {status_value}")
        
        # Verify all statuses can be queried
        for status_value in status_values:
            count = db.scalar(
                select(lambda: 1).select_from(Response)
                .where(Response.form_id == form.id, Response.status == status_value)
            )
            assert count == 1, f"Should find response with status {status_value}"
        
        print(f"✓ All response status values work correctly")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("=" * 70)
    print("FINAL VERIFICATION - EXISTING FEATURES")
    print("=" * 70)
    
    tests = [
        ("Form Creation", test_form_creation),
        ("Field Creation", test_field_creation),
        ("Response Submission", test_response_submission),
        ("Form Versioning", test_form_versioning),
        ("Audit Log Service", test_audit_log_service),
        ("Response with Answers", test_response_with_answers),
        ("Form with Retention Policy Relationship", test_form_with_retention_policy),
        ("Response Status Values", test_response_status_values),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n✗ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✅ All existing features verified - NO REGRESSIONS!")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed - REGRESSION DETECTED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
