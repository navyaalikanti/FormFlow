"""
Verify that audit logs are properly created when responses are archived.
Tests the integration between retention service and audit log service.
"""

import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models import RetentionPolicy
from app.models.form_platform import Form, Response, AuditLog
from app.services.retention_service import RetentionService
from app.database.session import SessionLocal
from sqlalchemy import select


def test_audit_log_creation_on_archival():
    """Test that audit logs are created when responses are archived."""
    print("\n=== TEST: Audit Log Creation on Archival ===")
    try:
        db = SessionLocal()
        
        # Create test form
        form = Form(
            title="Test Audit Form",
            public_slug=f"test-audit-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
            status="published",
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        print(f"✓ Created test form: {form.id}")
        
        # Enable retention policy (1 day)
        policy = RetentionService.update_retention_policy(
            db,
            form.id,
            enabled=True,
            retention_days=1,
        )
        print(f"✓ Configured retention policy: {policy.retention_days} days")
        
        # Create multiple old responses
        old_responses = []
        for i in range(3):
            response = Response(
                id=uuid4(),
                form_id=form.id,
                status="submitted",
                submitted_at=datetime.now(timezone.utc) - timedelta(days=2),
            )
            db.add(response)
            old_responses.append(response)
        db.commit()
        print(f"✓ Created {len(old_responses)} old responses (2 days ago)")
        
        # Get count of existing audit logs for this form
        existing_logs = db.scalars(
            select(AuditLog).where(
                AuditLog.form_id == form.id,
                AuditLog.action == "RETENTION_ARCHIVE_RESPONSES"
            )
        ).all()
        existing_count = len(existing_logs)
        print(f"  - Existing audit logs for this form: {existing_count}")
        
        # Run archival
        result = RetentionService.archive_expired_responses(db)
        print(f"✓ Archival completed:")
        print(f"  - forms_processed: {result['forms_processed']}")
        print(f"  - responses_archived: {result['responses_archived']}")
        
        # Verify audit log was created
        new_logs = db.scalars(
            select(AuditLog).where(
                AuditLog.form_id == form.id,
                AuditLog.action == "RETENTION_ARCHIVE_RESPONSES"
            )
        ).all()
        
        new_log_count = len(new_logs)
        assert new_log_count > existing_count, "Audit log should be created"
        print(f"✓ Audit log created:")
        
        # Get the latest log
        latest_log = new_logs[-1]
        print(f"  - ID: {latest_log.id}")
        print(f"  - Action: {latest_log.action}")
        print(f"  - Form ID: {latest_log.form_id}")
        print(f"  - Resource Type: {latest_log.resource_type}")
        print(f"  - User ID: {latest_log.user_id}")
        print(f"  - Created At: {latest_log.created_at}")
        
        # Verify audit log details
        assert latest_log.action == "RETENTION_ARCHIVE_RESPONSES", "Wrong action"
        assert latest_log.form_id == form.id, "Wrong form ID"
        assert latest_log.resource_type == "response", "Wrong resource type"
        assert latest_log.user_id is None, "User ID should be None for system action"
        print(f"✓ Audit log details verified")
        
        # Verify details JSONB
        details = latest_log.details
        print(f"  - Details:")
        print(f"    • responses_archived: {details.get('responses_archived')}")
        print(f"    • retention_days: {details.get('retention_days')}")
        print(f"    • cutoff_date: {details.get('cutoff_date')}")
        
        assert "responses_archived" in details, "Details should contain responses_archived"
        assert details["responses_archived"] == 3, "Should archive 3 responses"
        assert details["retention_days"] == 1, "Should have 1 day retention"
        assert details["cutoff_date"] is not None, "Details should contain cutoff_date"
        print(f"✓ Audit log details content verified")
        
        # Verify responses are archived
        archived = db.scalars(
            select(Response).where(
                Response.form_id == form.id,
                Response.status == "archived"
            )
        ).all()
        assert len(archived) == 3, "All 3 responses should be archived"
        print(f"✓ Response status verified: {len(archived)} archived")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_audit_log_not_created_for_disabled_policy():
    """Test that audit logs are NOT created when policy is disabled."""
    print("\n=== TEST: No Audit Log When Policy Disabled ===")
    try:
        db = SessionLocal()
        
        # Create test form
        form = Form(
            title="Test Disabled Policy Form",
            public_slug=f"test-disabled-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
            status="published",
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        print(f"✓ Created test form: {form.id}")
        
        # Create retention policy but DISABLED
        policy = RetentionService.get_or_create_retention_policy(db, form.id)
        # Verify it's disabled by default
        assert policy.enabled == False, "Policy should be disabled by default"
        print(f"✓ Retention policy is disabled (default)")
        
        # Create old response
        old_response = Response(
            id=uuid4(),
            form_id=form.id,
            status="submitted",
            submitted_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db.add(old_response)
        db.commit()
        print(f"✓ Created old response (2 days ago)")
        
        # Count existing logs
        existing_logs = db.scalars(
            select(AuditLog).where(
                AuditLog.form_id == form.id,
                AuditLog.action == "RETENTION_ARCHIVE_RESPONSES"
            )
        ).all()
        existing_count = len(existing_logs)
        
        # Run archival
        result = RetentionService.archive_expired_responses(db)
        print(f"✓ Archival completed:")
        print(f"  - forms_processed: {result['forms_processed']}")
        print(f"  - responses_archived: {result['responses_archived']}")
        
        # Verify NO audit log was created (form was skipped because policy disabled)
        new_logs = db.scalars(
            select(AuditLog).where(
                AuditLog.form_id == form.id,
                AuditLog.action == "RETENTION_ARCHIVE_RESPONSES"
            )
        ).all()
        new_log_count = len(new_logs)
        
        assert new_log_count == existing_count, "No audit log should be created for disabled policy"
        print(f"✓ No audit log created (policy disabled)")
        
        # Verify response is still submitted
        response = db.scalars(
            select(Response).where(Response.id == old_response.id)
        ).first()
        assert response.status == "submitted", "Response should not be archived"
        print(f"✓ Response status preserved: {response.status}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_audit_log_for_multiple_forms():
    """Test that separate audit logs are created for each form."""
    print("\n=== TEST: Separate Audit Logs per Form ===")
    try:
        db = SessionLocal()
        
        # Create two forms with retention enabled
        forms = []
        for i in range(2):
            form = Form(
                title=f"Test Form {i+1}",
                public_slug=f"test-multi-{i}-{uuid4().hex[:4]}",
                share_token=uuid4().hex,
                owner_admin_id=None,
                status="published",
            )
            db.add(form)
            db.commit()
            db.refresh(form)
            forms.append(form)
            
            # Enable retention
            RetentionService.update_retention_policy(
                db, form.id, enabled=True, retention_days=1
            )
            
            # Create old response
            response = Response(
                id=uuid4(),
                form_id=form.id,
                status="submitted",
                submitted_at=datetime.now(timezone.utc) - timedelta(days=2),
            )
            db.add(response)
            db.commit()
        
        print(f"✓ Created {len(forms)} forms with retention enabled")
        
        # Run archival
        result = RetentionService.archive_expired_responses(db)
        print(f"✓ Archival completed: {result['responses_archived']} responses archived")
        
        # Verify audit logs exist for each form
        for i, form in enumerate(forms):
            logs = db.scalars(
                select(AuditLog).where(
                    AuditLog.form_id == form.id,
                    AuditLog.action == "RETENTION_ARCHIVE_RESPONSES"
                )
            ).all()
            assert len(logs) > 0, f"Audit log should exist for form {i+1}"
            print(f"✓ Audit log exists for form {i+1}: {len(logs)} log(s)")
            
            # Verify details
            latest_log = logs[-1]
            assert latest_log.details["responses_archived"] == 1, "Should archive 1 response per form"
        
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
    print("AUDIT LOGS & RESPONSE ARCHIVAL VERIFICATION")
    print("=" * 70)
    
    tests = [
        ("Audit Log Creation on Archival", test_audit_log_creation_on_archival),
        ("No Audit Log When Policy Disabled", test_audit_log_not_created_for_disabled_policy),
        ("Separate Audit Logs per Form", test_audit_log_for_multiple_forms),
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
        print("\n🎉 All audit log tests passed!")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
