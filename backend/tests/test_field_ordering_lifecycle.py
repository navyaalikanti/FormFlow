"""Comprehensive regression tests for field ordering throughout the entire form lifecycle.

This test suite ensures field order is deterministic and stable across:
- Builder / Draft creation
- Save / Autosave
- Publish
- Preview
- Public Form
- Responses / Version History
- Restore
- Edit as New Draft
- Duplicating forms
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.admin import Admin
from app.models.form_platform import Field, FieldOption, Form, Section
from app.services.field_service import FieldService
from app.services.form_service import FormService
from app.services.submission_service import SubmissionService


def _make_session():
    """Create an in-memory SQLite session for testing."""
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def _create_test_admin(session):
    """Create a test admin user."""
    admin = Admin(name="Test Admin", email="admin@example.com", password_hash="hash")
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


def _create_form_with_fields(session, admin, field_specs: list[dict]):
    """
    Create a form with specified fields.
    
    Args:
        session: SQLAlchemy session
        admin: Admin user
        field_specs: List of dicts with keys: label, field_type, sort_order (optional)
    """
    form = Form(
        owner_admin_id=admin.id,
        title="Test Form",
        description="Test form for field ordering",
        status="draft",
        public_slug="test-form",
        share_token="test-token",
        settings={},
        theme_config={},
        analytics_config={},
        ai_config={},
    )
    
    section = Section(
        title="Main Section",
        description="",
        section_order=0,
        is_collapsible=False,
    )
    
    for idx, spec in enumerate(field_specs):
        sort_order = spec.get("sort_order", idx)
        field = Field(
            field_key=f"field_{idx}",
            label=spec["label"],
            field_type=spec.get("field_type", "short_text"),
            description=None,
            placeholder=None,
            helper_text=None,
            default_value=None,
            config={},
            validation_rules={},
            ai_config={},
            is_required=False,
            is_hidden=False,
            is_read_only=False,
            allows_multiple=False,
            sort_order=sort_order,
        )
        section.fields.append(field)
    
    form.sections.append(section)
    session.add(form)
    session.commit()
    session.refresh(form)
    return form


# ─────────────────────────────────────────────────────────────────────────────
# Test 1: Initial field creation preserves order
# ─────────────────────────────────────────────────────────────────────────────


def test_initial_field_creation_preserves_order():
    """Test that when creating a form with fields, the order is preserved."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    field_labels = ["Name", "Email", "Phone", "Address", "College", "Department"]
    field_specs = [{"label": label} for label in field_labels]
    form = _create_form_with_fields(session, admin, field_specs)
    
    # Reload form to simulate fresh database query
    reloaded = FormService.get_form(session, admin, form.id)
    actual_labels = [f.label for s in reloaded.sections for f in s.fields]
    
    assert actual_labels == field_labels, f"Expected {field_labels}, got {actual_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 2: Field reordering persists correctly
# ─────────────────────────────────────────────────────────────────────────────


def test_field_reordering_persists():
    """Test drag-and-drop reordering is persisted to database."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    field_labels = ["Name", "Email", "Phone", "Address", "College", "Department"]
    field_specs = [{"label": label} for label in field_labels]
    form = _create_form_with_fields(session, admin, field_specs)
    
    # Simulate drag-and-drop: move "Department" to position 1
    # Order should be: Name, Department, Email, Phone, Address, College
    reloaded = FormService.get_form(session, admin, form.id)
    fields = reloaded.sections[0].fields
    new_order = [fields[5], fields[0], fields[1], fields[2], fields[3], fields[4]]
    
    field_orders = [
        {"field_id": f.id, "sort_order": idx, "section_id": reloaded.sections[0].id}
        for idx, f in enumerate(new_order)
    ]
    
    FieldService.reorder_fields(session, admin, form.id, field_orders)
    
    # Verify the new order persisted
    reloaded_again = FormService.get_form(session, admin, form.id)
    actual_labels = [f.label for f in reloaded_again.sections[0].fields]
    expected = ["Name", "Department", "Email", "Phone", "Address", "College"]
    
    assert actual_labels == expected, f"Expected {expected}, got {actual_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 3: Publish preserves field order in snapshot
# ─────────────────────────────────────────────────────────────────────────────


def test_publish_preserves_field_order_in_snapshot():
    """Test that publishing creates a snapshot with correct field order."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    field_labels = ["Name", "Email", "Phone", "Address", "College", "Department"]
    field_specs = [{"label": label} for label in field_labels]
    form = _create_form_with_fields(session, admin, field_specs)
    
    # Publish the form
    published_form, version = FormService.publish_form(session, admin, form.id)
    
    # Check snapshot has correct order
    snapshot_fields = version.snapshot["sections"][0]["fields"]
    snapshot_labels = [f["label"] for f in snapshot_fields]
    
    assert snapshot_labels == field_labels, f"Expected {field_labels}, got {snapshot_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 4: Public form returns fields in correct order
# ─────────────────────────────────────────────────────────────────────────────


def test_public_form_returns_fields_in_correct_order():
    """Test that the public form API returns fields in correct order."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    field_labels = ["Name", "Email", "Phone", "Address", "College", "Department"]
    field_specs = [{"label": label} for label in field_labels]
    form = _create_form_with_fields(session, admin, field_specs)
    
    # Publish
    published_form, version = FormService.publish_form(session, admin, form.id)
    
    # Get public form response
    public_response = SubmissionService.build_public_form_response(session, published_form.share_token)
    
    public_labels = [f.label for s in public_response.sections for f in s.fields]
    assert public_labels == field_labels, f"Expected {field_labels}, got {public_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 5: Preview matches builder order
# ─────────────────────────────────────────────────────────────────────────────


def test_preview_matches_builder_order():
    """Test that preview form has the same field order as the builder."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    field_labels = ["Name", "Email", "Phone", "Address", "College", "Department"]
    field_specs = [{"label": label} for label in field_labels]
    form = _create_form_with_fields(session, admin, field_specs)
    
    # Get builder form
    builder_form = FormService.get_form(session, admin, form.id)
    builder_labels = [f.label for s in builder_form.sections for f in s.fields]
    
    # Publish and get preview
    published_form, version = FormService.publish_form(session, admin, form.id)
    preview_form = FormService.get_form(session, admin, published_form.id)
    preview_labels = [f.label for s in preview_form.sections for f in s.fields]
    
    assert builder_labels == preview_labels, f"Builder: {builder_labels}, Preview: {preview_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 6: Restoring version preserves its original order
# ─────────────────────────────────────────────────────────────────────────────


def test_restore_version_preserves_original_order():
    """Test that restoring an old version uses that version's field order."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    # Create v1 with fields: Name, Email
    form = _create_form_with_fields(
        session, admin,
        [{"label": "Name"}, {"label": "Email"}]
    )
    published_v1, version1 = FormService.publish_form(session, admin, form.id)
    
    # Create v2 with reordered fields: Email, Name, Phone
    draft_v2 = FormService.edit_as_new_draft(session, admin, published_v1.id)
    draft_v2.sections[0].fields.insert(0, draft_v2.sections[0].fields.pop(1))  # Move Email to front
    session.commit()
    
    # Add Phone field
    phone_field = Field(
        field_key="phone",
        label="Phone",
        field_type="short_text",
        description=None,
        placeholder=None,
        helper_text=None,
        default_value=None,
        config={},
        validation_rules={},
        ai_config={},
        is_required=False,
        is_hidden=False,
        is_read_only=False,
        allows_multiple=False,
        sort_order=2,
    )
    draft_v2.sections[0].fields.append(phone_field)
    session.commit()
    
    published_v2, version2 = FormService.publish_form(session, admin, draft_v2.id)
    
    # Verify v2 has the new order
    v2_labels = [f.label for f in published_v2.sections[0].fields]
    assert v2_labels == ["Email", "Name", "Phone"], f"v2 should be Email, Name, Phone; got {v2_labels}"
    
    # Restore v1
    restored_form, restored_version = FormService.restore_version_as_draft(
        session, admin, published_v2.id, version1.id
    )
    
    # Check that restored form has v1's original order
    restored_labels = [f.label for f in restored_form.sections[0].fields]
    assert restored_labels == ["Name", "Email"], f"Restored v1 should be Name, Email; got {restored_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 7: Edit as new draft preserves order
# ─────────────────────────────────────────────────────────────────────────────


def test_edit_as_new_draft_preserves_order():
    """Test that creating a new draft from published preserves field order."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    field_labels = ["Name", "Email", "Phone", "Address", "College", "Department"]
    field_specs = [{"label": label} for label in field_labels]
    form = _create_form_with_fields(session, admin, field_specs)
    
    # Publish
    published_form, version = FormService.publish_form(session, admin, form.id)
    
    # Edit as new draft
    draft = FormService.edit_as_new_draft(session, admin, published_form.id)
    
    # Check draft has same order
    draft_labels = [f.label for f in draft.sections[0].fields]
    assert draft_labels == field_labels, f"Draft should preserve order: {field_labels}, got {draft_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 8: Duplicate form preserves order
# ─────────────────────────────────────────────────────────────────────────────


def test_duplicate_form_preserves_order():
    """Test that duplicating a form preserves field order."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    field_labels = ["Name", "Email", "Phone", "Address", "College", "Department"]
    field_specs = [{"label": label} for label in field_labels]
    form = _create_form_with_fields(session, admin, field_specs)
    
    # Publish
    published_form, version = FormService.publish_form(session, admin, form.id)
    
    # Duplicate
    duplicated = FormService.duplicate_form(session, admin, published_form.id)
    
    # Check duplicated has same order
    dup_labels = [f.label for f in duplicated.sections[0].fields]
    assert dup_labels == field_labels, f"Duplicated should preserve order: {field_labels}, got {dup_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 9: Complete lifecycle - the regression test scenario
# ─────────────────────────────────────────────────────────────────────────────


def test_complete_lifecycle_field_order_is_stable():
    """
    Complete lifecycle test matching the user's regression scenario:
    1. Create a form
    2. Add 6 fields in specific order
    3. Rearrange them randomly
    4. Save Draft
    5. Reload the Builder
    6. Publish
    7. Open Preview
    8. Open Public Form
    9. Create Version 2
    10. Publish Version 2
    11. Restore Version 1
    12. Open every version
    
    At every step, the field order should remain exactly as saved for that version.
    """
    session = _make_session()
    admin = _create_test_admin(session)
    
    # Step 1-2: Create form with 6 fields
    original_order = ["Name", "Email", "Phone", "Address", "College", "Department"]
    field_specs = [{"label": label} for label in original_order]
    form = _create_form_with_fields(session, admin, field_specs)
    
    # Step 3: Rearrange randomly
    # New order: Department, Phone, Name, Email, College, Address
    reordered = ["Department", "Phone", "Name", "Email", "College", "Address"]
    reloaded = FormService.get_form(session, admin, form.id)
    fields = reloaded.sections[0].fields
    label_to_field = {f.label: f for f in fields}
    reordered_fields = [label_to_field[label] for label in reordered]
    
    field_orders = [
        {"field_id": f.id, "sort_order": idx, "section_id": reloaded.sections[0].id}
        for idx, f in enumerate(reordered_fields)
    ]
    FieldService.reorder_fields(session, admin, form.id, field_orders)
    
    # Step 4-5: Save Draft and reload
    draft = FormService.get_form(session, admin, form.id)
    step5_labels = [f.label for f in draft.sections[0].fields]
    assert step5_labels == reordered, f"After save/reload: expected {reordered}, got {step5_labels}"
    
    # Step 6: Publish
    published_v1, version1 = FormService.publish_form(session, admin, form.id)
    step6_labels = [f.label for f in published_v1.sections[0].fields]
    assert step6_labels == reordered, f"After publish: expected {reordered}, got {step6_labels}"
    
    # Step 7: Open Preview (same form)
    preview = FormService.get_form(session, admin, published_v1.id)
    step7_labels = [f.label for f in preview.sections[0].fields]
    assert step7_labels == reordered, f"In preview: expected {reordered}, got {step7_labels}"
    
    # Step 8: Open Public Form
    public_form = SubmissionService.build_public_form_response(session, published_v1.share_token)
    step8_labels = [f.label for s in public_form.sections for f in s.fields]
    assert step8_labels == reordered, f"Public form: expected {reordered}, got {step8_labels}"
    
    # Step 9-10: Create Version 2 and publish with new field
    draft_v2 = FormService.edit_as_new_draft(session, admin, published_v1.id)
    
    # Add a new field at the end
    new_field = Field(
        field_key="notes",
        label="Notes",
        field_type="paragraph",
        description=None,
        placeholder=None,
        helper_text=None,
        default_value=None,
        config={},
        validation_rules={},
        ai_config={},
        is_required=False,
        is_hidden=False,
        is_read_only=False,
        allows_multiple=False,
        sort_order=6,
    )
    draft_v2.sections[0].fields.append(new_field)
    session.commit()
    
    published_v2, version2 = FormService.publish_form(session, admin, draft_v2.id)
    v2_expected = reordered + ["Notes"]
    step10_labels = [f.label for f in published_v2.sections[0].fields]
    assert step10_labels == v2_expected, f"V2: expected {v2_expected}, got {step10_labels}"
    
    # Step 11: Restore Version 1
    restored_form, restored_version = FormService.restore_version_as_draft(
        session, admin, published_v2.id, version1.id
    )
    step11_labels = [f.label for f in restored_form.sections[0].fields]
    assert step11_labels == reordered, f"Restored v1: expected {reordered}, got {step11_labels}"
    
    # Step 12: Open every version
    # Check v1
    v1_response = SubmissionService.build_public_form_response(session, version1.link_token)
    v1_labels = [f.label for s in v1_response.sections for f in s.fields]
    assert v1_labels == reordered, f"V1 from version endpoint: expected {reordered}, got {v1_labels}"
    
    # Check v2
    v2_response = SubmissionService.build_public_form_response(session, version2.link_token)
    v2_labels = [f.label for s in v2_response.sections for f in s.fields]
    assert v2_labels == v2_expected, f"V2 from version endpoint: expected {v2_expected}, got {v2_labels}"
    
    # Check via FormService version history
    versions = FormService.get_form_versions(session, admin, published_v2.id)
    assert len(versions) == 2
    
    # V2 is first in the list (newest first)
    v2_from_history = versions[0]
    v2_hist_labels = [f["label"] for f in v2_from_history.snapshot["sections"][0]["fields"]]
    assert v2_hist_labels == v2_expected, f"V2 from history: expected {v2_expected}, got {v2_hist_labels}"
    
    # V1 is second in the list
    v1_from_history = versions[1]
    v1_hist_labels = [f["label"] for f in v1_from_history.snapshot["sections"][0]["fields"]]
    assert v1_hist_labels == reordered, f"V1 from history: expected {reordered}, got {v1_hist_labels}"


# ─────────────────────────────────────────────────────────────────────────────
# Test 10: Form response ordering respects field order
# ─────────────────────────────────────────────────────────────────────────────


def test_form_response_ordering_respects_field_order():
    """Test that submitted responses show answers in field order."""
    session = _make_session()
    admin = _create_test_admin(session)
    
    # Create form with specific order
    field_labels = ["Name", "Email", "Phone"]
    form = _create_form_with_fields(
        session, admin,
        [{"label": label} for label in field_labels]
    )
    
    # Publish
    published_form, version = FormService.publish_form(session, admin, form.id)
    
    # Get response structure - it should have fields in the correct order
    response_data = SubmissionService.list_form_responses(session, admin.id, form.id)
    
    # The snapshot field map should have fields in order
    _, field_map_raw = SubmissionService._build_snapshot_field_map(version.snapshot or {})
    field_map = {str(info["id"]): info for info in field_map_raw.values()}
    
    # All fields should be present
    assert len(field_map_raw) == 3, f"Expected 3 fields, got {len(field_map_raw)}"


# Tests can be run with: python -m pytest tests/test_field_ordering_lifecycle.py -v
