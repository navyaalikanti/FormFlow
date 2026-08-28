"""Regression tests for form publish/version cloning."""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.admin import Admin
from app.models.form_platform import ConditionalLogic, Field, FieldOption, Form, FormVersion, Section
from app.services.form_service import FormService
from app.services.submission_service import SubmissionService


def _make_session():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def _create_form(session, admin, title="Customer Feedback"):
    form = Form(
        owner_admin_id=admin.id,
        title=title,
        description="Initial draft",
        status="draft",
        public_slug="customer-feedback",
        share_token="share-token-initial",
        settings={"allow_multiple_submissions": False},
        theme_config={"accent": "orange"},
        analytics_config={"enabled": True},
        ai_config={"enabled": False},
    )
    section = Section(
        title="Section 1",
        description="Main section",
        section_order=0,
        is_collapsible=False,
    )
    field = Field(
        field_key="name",
        label="Name",
        field_type="short_text",
        description="Your full name",
        placeholder="Jane Doe",
        helper_text="Enter your legal name",
        default_value=None,
        config={"trim": True},
        validation_rules={"min_length": 2},
        ai_config={},
        is_required=True,
        is_hidden=False,
        is_read_only=False,
        allows_multiple=False,
        sort_order=0,
    )
    field.options = [
        FieldOption(
            label="Option A",
            option_value="option_a",
            sort_order=0,
            is_default=False,
            option_config={},
        )
    ]
    section.fields.append(field)

    email_field = Field(
        field_key="email",
        label="Email",
        field_type="email",
        description="Email address",
        placeholder="jane@example.com",
        helper_text=None,
        default_value=None,
        config={},
        validation_rules={"pattern": r"^[^@]+@[^@]+\.[^@]+$"},
        ai_config={},
        is_required=False,
        is_hidden=False,
        is_read_only=False,
        allows_multiple=False,
        sort_order=1,
    )
    section.fields.append(email_field)
    form.sections.append(section)
    session.add(form)
    session.commit()
    session.refresh(form)

    session.add(
        ConditionalLogic(
            form_id=form.id,
            source_field_id=field.id,
            target_field_id=email_field.id,
            trigger_event="change",
            operator="equals",
            comparison_value="show-email",
            action_type="show",
            action_config={"target_field_key": "email"},
            priority=0,
            is_active=True,
        )
    )
    session.commit()
    return form


def test_publish_draft_keeps_sections_fields_and_draft_row():
    session = _make_session()
    admin = Admin(name="Test Admin", email="admin@example.com", password_hash="hash")
    session.add(admin)
    session.commit()
    session.refresh(admin)

    original = _create_form(session, admin)
    root_published_form, version1 = FormService.publish_form(session, admin, original.id)

    draft = FormService.edit_as_new_draft(session, admin, root_published_form.id)
    draft.title = "Customer Feedback v2"
    draft.sections[0].title = "Updated Section 1"
    draft.sections[0].fields[0].label = "Full name"
    draft.sections[0].fields[0].validation_rules = {"min_length": 3}

    extra_field = Field(
        field_key="phone",
        label="Phone",
        field_type="phone",
        description="Phone number",
        placeholder="+1 555 555 5555",
        helper_text=None,
        default_value=None,
        config={},
        validation_rules={"min_length": 10},
        ai_config={},
        is_required=True,
        is_hidden=False,
        is_read_only=False,
        allows_multiple=False,
        sort_order=1,
    )
    draft.sections[0].fields.append(extra_field)
    session.add(extra_field)
    session.commit()

    republished_form, version2 = FormService.publish_form(session, admin, draft.id)

    assert republished_form.id == draft.id
    assert republished_form.published_version_id == version2.id
    assert republished_form.status == "published"
    assert len(republished_form.sections) == 1
    assert [field.label for field in republished_form.sections[0].fields] == ["Full name", "Email", "Phone"]
    assert republished_form.sections[0].fields[0].validation_rules == {"min_length": 3}

    preserved_root = FormService.get_form(session, admin, root_published_form.id)
    assert preserved_root.status == "published"
    assert preserved_root.published_version_id == version1.id
    assert [field.label for field in preserved_root.sections[0].fields] == ["Name", "Email"]
    assert preserved_root.sections[0].fields[0].validation_rules == {"min_length": 2}

    versions = FormService.get_form_versions(session, admin, republished_form.id)
    assert [version.version_number for version in versions] == [2, 1]
    assert version1.snapshot["sections"][0]["fields"][0]["label"] == "Name"
    assert version1.snapshot["conditional_logic_rules"][0]["action_config"]["target_field_key"] == "email"
    assert version2.snapshot["sections"][0]["fields"][0]["label"] == "Full name"
    assert version2.snapshot["sections"][0]["fields"][1]["label"] == "Email"
    assert version2.snapshot["conditional_logic_rules"][0]["action_config"]["target_field_key"] == "email"

    # The promoted draft should keep its own published copy, while the root form stays immutable.
    assert republished_form.sections[0].fields[0].label == "Full name"
    assert root_published_form.id != republished_form.id


def test_public_url_tokens_resolve_specific_versions():
    session = _make_session()
    admin = Admin(name="Test Admin", email="admin@example.com", password_hash="hash")
    session.add(admin)
    session.commit()
    session.refresh(admin)

    original = _create_form(session, admin)
    published_v1, version1 = FormService.publish_form(session, admin, original.id)
    draft = FormService.edit_as_new_draft(session, admin, published_v1.id)
    draft.sections[0].fields.append(
        Field(
            field_key="number",
            label="Number",
            field_type="number",
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
    )
    session.commit()
    published_v2, version2 = FormService.publish_form(session, admin, draft.id)

    _, resolved_v1, snapshot_v1, _ = SubmissionService.resolve_public_form_context(session, version1.link_token)
    _, resolved_v2, snapshot_v2, _ = SubmissionService.resolve_public_form_context(session, version2.link_token)

    assert resolved_v1.id == published_v1.id
    assert [field["label"] for field in snapshot_v1["sections"][0]["fields"]] == ["Name", "Email"]
    assert resolved_v2.id == published_v2.id
    assert [field["label"] for field in snapshot_v2["sections"][0]["fields"]] == ["Name", "Email", "Number"]
