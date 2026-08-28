"""
End-to-end test script for Data Retention Policy feature.
Tests all retention policy functionality without requiring a running server.
"""

import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

# Test imports
try:
    from app.models import RetentionPolicy
    from app.models.form_platform import Form, Response
    from app.services.retention_service import RetentionService
    from app.services.audit_log_service import AuditLogService
    from app.database.session import SessionLocal
    from sqlalchemy import select
    print("✓ All imports successful")
except ImportError as e:
    print(f"✗ Import failed: {e}")
    sys.exit(1)

def test_retention_policy_model():
    """Test RetentionPolicy model creation and relationships."""
    print("\n=== TEST 1: RetentionPolicy Model ===")
    try:
        db = SessionLocal()
        
        # Create test form
        form = Form(
            title="Test Retention Form",
            public_slug=f"test-retention-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        print(f"✓ Created test form: {form.id}")
        
        # Create retention policy
        policy = RetentionPolicy(
            form_id=form.id,
            enabled=True,
            retention_days=90,
            action="archive",
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)
        print(f"✓ Created retention policy: {policy.id}")
        print(f"  - enabled: {policy.enabled}")
        print(f"  - retention_days: {policy.retention_days}")
        print(f"  - action: {policy.action}")
        
        # Verify relationship
        form_with_policy = db.scalars(select(Form).where(Form.id == form.id)).first()
        assert form_with_policy.retention_policy is not None, "Relationship not loaded"
        print(f"✓ Retention policy relationship verified")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def test_retention_service_get_or_create():
    """Test get_or_create_retention_policy function."""
    print("\n=== TEST 2: RetentionService.get_or_create_retention_policy ===")
    try:
        db = SessionLocal()
        
        # Create test form
        form = Form(
            title="Test Service Form",
            public_slug=f"test-service-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Test get_or_create (should create default)
        policy = RetentionService.get_or_create_retention_policy(db, form.id)
        assert policy is not None, "Policy should be created"
        assert policy.enabled == False, "Default should be disabled"
        assert policy.retention_days == 90, "Default should be 90 days"
        print(f"✓ Default policy created: {policy.id}")
        print(f"  - enabled: {policy.enabled}")
        print(f"  - retention_days: {policy.retention_days}")
        
        # Test get_or_create (should return existing)
        policy2 = RetentionService.get_or_create_retention_policy(db, form.id)
        assert policy2.id == policy.id, "Should return existing policy"
        print(f"✓ Existing policy retrieved: {policy2.id}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def test_retention_service_update():
    """Test update_retention_policy function."""
    print("\n=== TEST 3: RetentionService.update_retention_policy ===")
    try:
        db = SessionLocal()
        
        # Create test form
        form = Form(
            title="Test Update Form",
            public_slug=f"test-update-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Update policy
        policy = RetentionService.update_retention_policy(
            db,
            form.id,
            enabled=True,
            retention_days=60,
        )
        assert policy.enabled == True, "Should be enabled"
        assert policy.retention_days == 60, "Should be 60 days"
        print(f"✓ Policy updated successfully")
        print(f"  - enabled: {policy.enabled}")
        print(f"  - retention_days: {policy.retention_days}")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def test_archive_expired_responses():
    """Test archive_expired_responses function."""
    print("\n=== TEST 4: RetentionService.archive_expired_responses ===")
    try:
        db = SessionLocal()
        
        # Create test form
        form = Form(
            title="Test Archive Form",
            public_slug=f"test-archive-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
            status="published",
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Enable retention policy for 1 day
        policy = RetentionService.update_retention_policy(
            db,
            form.id,
            enabled=True,
            retention_days=1,
        )
        print(f"✓ Retention policy configured: {policy.retention_days} days")
        
        # Create old response (2 days ago)
        old_response = Response(
            id=uuid4(),
            form_id=form.id,
            status="submitted",
            submitted_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db.add(old_response)
        db.commit()
        print(f"✓ Old response created (2 days ago): {old_response.id}")
        
        # Create recent response (30 min ago)
        recent_response = Response(
            id=uuid4(),
            form_id=form.id,
            status="submitted",
            submitted_at=datetime.now(timezone.utc) - timedelta(minutes=30),
        )
        db.add(recent_response)
        db.commit()
        print(f"✓ Recent response created (30 min ago): {recent_response.id}")
        
        # Run archival
        result = RetentionService.archive_expired_responses(db)
        print(f"✓ Archival completed")
        print(f"  - forms_processed: {result['forms_processed']}")
        print(f"  - responses_archived: {result['responses_archived']}")
        
        # Verify old response was archived
        archived = db.scalars(select(Response).where(Response.id == old_response.id)).first()
        assert archived.status == "archived", "Old response should be archived"
        print(f"✓ Old response archived: {archived.status}")
        
        # Verify recent response is still submitted
        recent = db.scalars(select(Response).where(Response.id == recent_response.id)).first()
        assert recent.status == "submitted", "Recent response should still be submitted"
        print(f"✓ Recent response preserved: {recent.status}")
        
        # Verify audit log was created
        from app.models.form_platform import AuditLog
        audit_logs = db.scalars(
            select(AuditLog)
            .where(AuditLog.action == "RETENTION_ARCHIVE_RESPONSES")
            .where(AuditLog.form_id == form.id)
        ).all()
        assert len(audit_logs) > 0, "Audit log should be created"
        print(f"✓ Audit log created: action=RETENTION_ARCHIVE_RESPONSES")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_idempotency():
    """Test that archival is idempotent (can run multiple times safely)."""
    print("\n=== TEST 5: Idempotency (Run Archival Twice) ===")
    try:
        db = SessionLocal()
        
        # Create test form
        form = Form(
            title="Test Idempotency Form",
            public_slug=f"test-idem-{uuid4().hex[:8]}",
            share_token=uuid4().hex,
            owner_admin_id=None,
            status="published",
        )
        db.add(form)
        db.commit()
        db.refresh(form)
        
        # Enable retention
        RetentionService.update_retention_policy(
            db, form.id, enabled=True, retention_days=1
        )
        
        # Create old response
        old_response = Response(
            id=uuid4(),
            form_id=form.id,
            status="submitted",
            submitted_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db.add(old_response)
        db.commit()
        
        # Run archival first time
        result1 = RetentionService.archive_expired_responses(db)
        print(f"✓ First archival run: {result1['responses_archived']} responses archived")
        
        # Run archival second time (should archive 0 responses)
        result2 = RetentionService.archive_expired_responses(db)
        print(f"✓ Second archival run: {result2['responses_archived']} responses archived")
        
        assert result2['responses_archived'] == 0, "Second run should archive 0 responses"
        print(f"✓ Idempotency verified: no double-archival")
        
        db.close()
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("DATA RETENTION POLICY - END-TO-END TESTS")
    print("=" * 60)
    
    tests = [
        ("RetentionPolicy Model", test_retention_policy_model),
        ("Get/Create Default Policy", test_retention_service_get_or_create),
        ("Update Policy", test_retention_service_update),
        ("Archive Expired Responses", test_archive_expired_responses),
        ("Idempotency", test_idempotency),
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
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
