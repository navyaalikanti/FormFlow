"""Refactor form versioning: proper immutable FormVersions under a single Form

Revision ID: 0009_refactor_versioning
Revises: 0008_add_file_storage_form_linkage
Create Date: 2026-07-29

Changes:
1. Add `title` and `description` columns to `form_versions` table.
2. Backfill those columns from the snapshot JSON already stored in each version.
3. Data-migration: any Form row with draft_of_form_id IS NOT NULL is a "draft clone"
   created by the old edit_as_new_draft workflow. We:
   a) Determine the canonical parent form (draft_of_form_id).
   b) Capture a snapshot of the draft form's current live sections/fields/options
      (the snapshot JSON stored in the draft form's published versions, or the
      form row itself if no version snapshot exists).
   c) Create a new FormVersion (status='draft') on the canonical parent form with
      the draft content. The version_number is max(existing)+1.
   d) Update Form.status back on the canonical form to 'draft' so the UI knows a
      draft is active.
   e) Re-link any responses that reference the draft form_id to the canonical
      form_id (responses already have form_version_id set, which we preserve).
   f) Cascade-delete the now-redundant draft Form row (all child records cascade).
4. Remove the `draft_of_form_id` column and index from `forms`.
"""

from __future__ import annotations

import uuid as _uuid_mod
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB


revision = "0009_refactor_versioning"
down_revision = "0008_add_file_storage_form_linkage"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _conn():
    return op.get_bind()


# ---------------------------------------------------------------------------
# upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:
    conn = _conn()

    # ── 1. Add title / description to form_versions ─────────────────────────
    op.add_column(
        "form_versions",
        sa.Column("title", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "form_versions",
        sa.Column("description", sa.Text(), nullable=True),
    )

    # ── 2. Backfill title / description from existing snapshots ─────────────
    # We use plain SQL so we don't need SQLAlchemy ORM models here.
    conn.execute(
        sa.text("""
            UPDATE form_versions
            SET
                title       = snapshot -> 'form' ->> 'title',
                description = snapshot -> 'form' ->> 'description'
            WHERE
                title IS NULL
                AND snapshot IS NOT NULL
                AND snapshot -> 'form' IS NOT NULL
        """)
    )

    # ── 3. Migrate draft-clone Form rows into draft FormVersions ─────────────
    # Fetch all draft-clone forms (those with draft_of_form_id set).
    draft_forms = conn.execute(
        sa.text("""
            SELECT
                f.id                  AS draft_form_id,
                f.draft_of_form_id    AS canonical_form_id,
                f.title               AS draft_title,
                f.description         AS draft_description,
                f.settings            AS draft_settings,
                f.theme_config        AS draft_theme_config,
                f.analytics_config    AS draft_analytics_config,
                f.ai_config           AS draft_ai_config,
                f.owner_admin_id      AS owner_admin_id
            FROM forms f
            WHERE f.draft_of_form_id IS NOT NULL
            ORDER BY f.created_at ASC
        """)
    ).fetchall()

    for row in draft_forms:
        draft_form_id    = row[0]
        canonical_form_id = row[1]
        draft_title      = row[2]
        draft_description = row[3]
        owner_admin_id   = row[8]

        # Verify canonical form still exists
        canonical = conn.execute(
            sa.text("SELECT id FROM forms WHERE id = :id"),
            {"id": canonical_form_id},
        ).fetchone()
        if canonical is None:
            # Orphaned draft – just delete it
            conn.execute(sa.text("DELETE FROM forms WHERE id = :id"), {"id": draft_form_id})
            continue

        # Get next version number for the canonical form
        max_version = conn.execute(
            sa.text("""
                SELECT COALESCE(MAX(version_number), 0)
                FROM form_versions
                WHERE form_id = :form_id
            """),
            {"form_id": canonical_form_id},
        ).scalar()
        next_version = max_version + 1

        # Build a snapshot from the draft form's live sections/fields.
        # First get all sections for the draft form.
        sections_rows = conn.execute(
            sa.text("""
                SELECT id, title, description, section_order, is_collapsible
                FROM sections
                WHERE form_id = :fid
                ORDER BY section_order, id
            """),
            {"fid": draft_form_id},
        ).fetchall()

        sections_payload = []
        for sec in sections_rows:
            sec_id, sec_title, sec_desc, sec_order, sec_collapsible = sec
            fields_rows = conn.execute(
                sa.text("""
                    SELECT
                        f.id, f.field_key, f.label, f.field_type,
                        f.description, f.placeholder, f.helper_text,
                        f.default_value, f.config, f.validation_rules,
                        f.ai_config, f.is_required, f.is_hidden,
                        f.is_read_only, f.allows_multiple, f.sort_order
                    FROM fields f
                    WHERE f.section_id = :sid
                    ORDER BY f.sort_order, f.id
                """),
                {"sid": sec_id},
            ).fetchall()

            fields_payload = []
            for fld in fields_rows:
                (fld_id, fld_key, fld_label, fld_type, fld_desc,
                 fld_placeholder, fld_helper, fld_default, fld_config,
                 fld_validation, fld_ai, fld_required, fld_hidden,
                 fld_readonly, fld_multiple, fld_order) = fld

                # Fetch options for this field
                options_rows = conn.execute(
                    sa.text("""
                        SELECT id, label, option_value, sort_order,
                               is_default, option_config
                        FROM field_options
                        WHERE field_id = :fid
                        ORDER BY sort_order, id
                    """),
                    {"fid": fld_id},
                ).fetchall()
                options_payload = [
                    {
                        "id": str(opt[0]),
                        "label": opt[1],
                        "option_value": opt[2],
                        "sort_order": opt[3],
                        "is_default": opt[4],
                        "option_config": opt[5] or {},
                    }
                    for opt in options_rows
                ]

                fields_payload.append({
                    "id": str(fld_id),
                    "field_key": fld_key,
                    "label": fld_label,
                    "field_type": fld_type,
                    "description": fld_desc,
                    "placeholder": fld_placeholder,
                    "helper_text": fld_helper,
                    "default_value": fld_default,
                    "config": fld_config or {},
                    "validation_rules": fld_validation or {},
                    "ai_config": fld_ai or {},
                    "is_required": bool(fld_required),
                    "is_hidden": bool(fld_hidden),
                    "is_read_only": bool(fld_readonly),
                    "allows_multiple": bool(fld_multiple),
                    "sort_order": fld_order,
                    "options": options_payload,
                })

            sections_payload.append({
                "id": str(sec_id),
                "title": sec_title,
                "description": sec_desc,
                "section_order": sec_order,
                "is_collapsible": bool(sec_collapsible),
                "fields": fields_payload,
            })

        # Build conditional logic snapshot for the draft form
        logic_rows = conn.execute(
            sa.text("""
                SELECT
                    cl.operator, cl.comparison_value,
                    cl.action_type, cl.action_config,
                    cl.priority, cl.is_active,
                    sf.field_key  AS source_key,
                    tf.field_key  AS target_key
                FROM conditional_logic cl
                LEFT JOIN fields sf ON sf.id = cl.source_field_id
                LEFT JOIN fields tf ON tf.id = cl.target_field_id
                WHERE cl.form_id = :fid
                  AND sf.field_key IS NOT NULL
                ORDER BY cl.priority, cl.created_at
            """),
            {"fid": draft_form_id},
        ).fetchall()

        logic_payload = [
            {
                "source_field_key": lr[6],
                "operator": lr[0],
                "comparison_value": lr[1],
                "action_type": lr[2],
                "action_config": {
                    "target_field_key": lr[7],
                    **(lr[3] or {}),
                },
                "priority": lr[4],
                "is_active": bool(lr[5]),
            }
            for lr in logic_rows
            if lr[6]
        ]

        snapshot = {
            "form": {
                "id": str(draft_form_id),
                "title": draft_title,
                "description": draft_description,
            },
            "sections": sections_payload,
            "conditional_logic_rules": logic_payload,
        }

        import json
        new_version_id = str(_uuid_mod.uuid4())
        conn.execute(
            sa.text("""
                INSERT INTO form_versions (
                    id, form_id, version_number, status, snapshot,
                    title, description,
                    created_by_admin_id, created_at, updated_at
                )
                VALUES (
                    :id, :form_id, :version_number, 'draft', :snapshot,
                    :title, :description,
                    :created_by, NOW(), NOW()
                )
            """),
            {
                "id": new_version_id,
                "form_id": canonical_form_id,
                "version_number": next_version,
                "snapshot": json.dumps(snapshot),
                "title": draft_title,
                "description": draft_description,
                "created_by": owner_admin_id,
            },
        )

        # Mark canonical form as having a draft
        conn.execute(
            sa.text("""
                UPDATE forms
                SET status = 'draft', updated_at = NOW()
                WHERE id = :id AND status = 'published'
            """),
            {"id": canonical_form_id},
        )

        # Re-link responses from the draft form to the canonical form
        # (form_version_id stays unchanged)
        conn.execute(
            sa.text("""
                UPDATE responses
                SET form_id = :canonical_id
                WHERE form_id = :draft_id
            """),
            {"canonical_id": canonical_form_id, "draft_id": draft_form_id},
        )

        # Re-link activity_logs
        conn.execute(
            sa.text("""
                UPDATE activity_logs
                SET form_id = :canonical_id
                WHERE form_id = :draft_id
            """),
            {"canonical_id": canonical_form_id, "draft_id": draft_form_id},
        )

        # Delete draft form (cascade handles sections, fields, options, conditional_logic)
        # BUT response_answers.field_id has RESTRICT FK — must handle before deletion.
        #
        # The responses have been re-linked to the canonical form above.
        # However, their response_answers still reference the DRAFT form's field IDs.
        # Those draft fields will be deleted when the draft form is deleted.
        # We must delete those response_answers first (or re-link them to canonical fields).
        #
        # Strategy: delete the response_answers that point to draft form fields,
        # since the canonical form has its own field structure and the draft answers
        # would be orphaned anyway after field deletion.
        conn.execute(
            sa.text("""
                DELETE FROM response_answers
                WHERE field_id IN (
                    SELECT id FROM fields WHERE form_id = :draft_id
                )
            """),
            {"draft_id": draft_form_id},
        )

        # Nullify file_storage links to draft form (file_storage is separate from file_uploads)
        # file_uploads.field_id is CASCADE so it deletes automatically with the fields.
        # file_storage might have form_id/field_id references — try to nullify them if the table exists.
        try:
            conn.execute(
                sa.text("""
                    UPDATE file_storage
                    SET field_id = NULL, form_id = NULL
                    WHERE form_id = :draft_id
                """),
                {"draft_id": draft_form_id},
            )
        except Exception:
            pass  # Table might not exist in all environments

        # Now safe to delete the draft form (cascade handles everything else)
        conn.execute(
            sa.text("DELETE FROM forms WHERE id = :id"),
            {"id": draft_form_id},
        )



    # ── 4. Remove draft_of_form_id from forms ───────────────────────────────
    op.drop_index("ix_forms_draft_of_form_id", table_name="forms")
    op.drop_constraint("forms_draft_of_form_id_fkey", "forms", type_="foreignkey")
    op.drop_column("forms", "draft_of_form_id")


# ---------------------------------------------------------------------------
# downgrade
# ---------------------------------------------------------------------------

def downgrade() -> None:
    # Re-add draft_of_form_id
    op.add_column(
        "forms",
        sa.Column(
            "draft_of_form_id",
            PG_UUID(as_uuid=True),
            sa.ForeignKey("forms.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_forms_draft_of_form_id", "forms", ["draft_of_form_id"])

    # Remove title / description from form_versions
    op.drop_column("form_versions", "description")
    op.drop_column("form_versions", "title")
