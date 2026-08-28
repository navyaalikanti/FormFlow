"""API endpoints for validation rules and conditional logic"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_admin
from app.models.admin import Admin
from app.models.form_platform import Field, Form
from app.schemas.validation import (
    BulkValidateRequest,
    ConditionalLogicEvaluationResult,
    ConditionalLogicRule,
    ConditionalLogicRuleCreate,
    ConditionalLogicRuleUpdate,
    EvaluateConditionalLogicRequest,
    ValidateAnswerRequest,
    ValidationResult,
)
from app.services.conditional_logic_service import (
    ConditionalLogicEngine,
    ConditionalLogicValidator,
)
from app.services.validation_service import ValidationService
from app.database.session import get_db

router = APIRouter(tags=["validation"])


# Validation Endpoints


@router.post("/forms/{form_id}/validate-answer", response_model=ValidationResult)
def validate_answer(
    form_id: UUID,
    request: ValidateAnswerRequest,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Validate a single field answer"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    field = db.query(Field).filter(Field.id == request.field_id, Field.form_id == form_id).first()
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")

    result = ValidationService.validate_field(
        request.answer_value,
        field.field_type,
        field.validation_rules,
        {
            "field_key": field.field_key,
            "field_type": field.field_type,
            "options": [{"id": opt.id, "value": opt.option_value, "label": opt.label} for opt in field.options],
            "validation_rules": field.validation_rules,
        },
    )

    return ValidationResult(
        is_valid=result.is_valid,
        errors=[
            {
                "field_key": field.field_key,
                "error_type": error["error_type"],
                "error_message": error["error_message"],
                "attempted_value": error["attempted_value"],
                "validation_rule": error["validation_rule"],
            }
            for error in result.errors
        ],
    )


@router.post("/forms/{form_id}/validate-answers")
def validate_answers(
    form_id: UUID,
    request: BulkValidateRequest,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Validate multiple field answers"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    results = {}
    for validation in request.field_validations:
        field = db.query(Field).filter(Field.id == validation.field_id, Field.form_id == form_id).first()
        if not field:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Field not found: {validation.field_id}")

        result = ValidationService.validate_field(
            validation.answer_value,
            field.field_type,
            field.validation_rules,
            {
                "field_key": field.field_key,
                "field_type": field.field_type,
                "options": [{"id": opt.id, "value": opt.option_value, "label": opt.label} for opt in field.options],
                "validation_rules": field.validation_rules,
            },
        )
        results[str(validation.field_id)] = result.to_dict()

    return {
        "results": results,
        "all_valid": all(r["is_valid"] for r in results.values()),
    }


@router.put("/forms/{form_id}/fields/{field_id}/validation-rules")
def update_field_validation_rules(
    form_id: UUID,
    field_id: UUID,
    validation_rules: dict,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Update validation rules for a field"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    field = db.query(Field).filter(Field.id == field_id, Field.form_id == form_id).first()
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")

    field.validation_rules = validation_rules
    db.commit()
    db.refresh(field)

    return {
        "id": field.id,
        "field_key": field.field_key,
        "validation_rules": field.validation_rules,
        "updated_at": field.updated_at.isoformat(),
    }


@router.get("/forms/{form_id}/fields/{field_id}/validation-schema")
def get_field_validation_schema(
    form_id: UUID,
    field_id: UUID,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Get validation schema for a field"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    field = db.query(Field).filter(Field.id == field_id, Field.form_id == form_id).first()
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")

    return {
        "id": field.id,
        "field_key": field.field_key,
        "field_type": field.field_type,
        "is_required": field.is_required,
        "validation_rules": field.validation_rules,
    }


# Conditional Logic Endpoints


@router.post("/forms/{form_id}/conditional-logic/evaluate")
def evaluate_conditional_logic(
    form_id: UUID,
    request: EvaluateConditionalLogicRequest,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Evaluate conditional logic rules for current response state"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    from app.models.form_platform import ConditionalLogic, Section

    # Get all form fields and sections
    sections = db.query(Section).filter(Section.form_id == form_id).all()
    all_fields = []
    for section in sections:
        all_fields.extend(section.fields)

    # Get conditional logic rules
    logic_rules = db.query(ConditionalLogic).filter(ConditionalLogic.form_id == form_id).order_by(ConditionalLogic.priority).all()

    # Convert to dict format for engine
    fields_dict = []
    for field in all_fields:
        fields_dict.append(
            {
                "field_key": field.field_key,
                "field_type": field.field_type,
                "is_hidden": field.is_hidden,
                "is_required": field.is_required,
                "validation_rules": field.validation_rules,
            }
        )

    rules_dict = []
    for rule in logic_rules:
        rules_dict.append(
            {
                "source_field_key": rule.source_field.field_key,
                "operator": rule.operator,
                "comparison_value": rule.comparison_value,
                "action_type": rule.action_type,
                "action_config": {
                    "target_field_key": rule.target_field.field_key if rule.target_field else None,
                    **rule.action_config,
                },
                "priority": rule.priority,
                "is_active": rule.is_active,
            }
        )

    # Evaluate logic
    engine = ConditionalLogicEngine()
    field_states = engine.get_field_state_map(fields_dict, rules_dict, request.response_answers)
    visibility = engine.get_field_visibility_map(fields_dict, rules_dict, request.response_answers)

    affected_fields = [
        field_key
        for field_key, state in field_states.items()
        if state.get("is_hidden") or state.get("is_disabled") or state.get("is_required", False) != next(
            (f["is_required"] for f in fields_dict if f["field_key"] == field_key), False
        )
    ]

    return {
        "field_states": field_states,
        "field_visibility": visibility,
        "affected_fields": affected_fields,
    }


@router.post("/forms/{form_id}/conditional-logic/rules", response_model=ConditionalLogicRule)
def create_conditional_logic_rule(
    form_id: UUID,
    rule: ConditionalLogicRuleCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Create a new conditional logic rule"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    from app.models.form_platform import ConditionalLogic

    # Find source field
    source_field = db.query(Field).filter(
        Field.form_id == form_id,
        Field.field_key == rule.source_field_key,
    ).first()

    if not source_field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source field not found")

    # Get target field
    target_field = db.query(Field).filter(
        Field.form_id == form_id,
        Field.field_key == rule.action_config.target_field_key,
    ).first()

    if not target_field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target field not found")

    # Create rule
    logic_rule = ConditionalLogic(
        form_id=form_id,
        source_field_id=source_field.id,
        target_field_id=target_field.id,
        trigger_event=rule.trigger_event,
        operator=rule.operator,
        comparison_value=rule.comparison_value,
        action_type=rule.action_type,
        action_config=rule.action_config.model_dump(),
        priority=rule.priority,
        is_active=rule.is_active,
    )

    db.add(logic_rule)
    db.commit()
    db.refresh(logic_rule)

    return {
        "id": logic_rule.id,
        "source_field_key": source_field.field_key,
        "operator": logic_rule.operator,
        "comparison_value": logic_rule.comparison_value,
        "action_type": logic_rule.action_type,
        "action_config": logic_rule.action_config,
        "priority": logic_rule.priority,
        "is_active": logic_rule.is_active,
    }


@router.get("/forms/{form_id}/conditional-logic/rules")
def list_conditional_logic_rules(
    form_id: UUID,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """List all conditional logic rules for a form"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    from app.models.form_platform import ConditionalLogic

    rules = db.query(ConditionalLogic).filter(ConditionalLogic.form_id == form_id).order_by(ConditionalLogic.priority).all()

    return [
        {
            "id": rule.id,
            "source_field_key": rule.source_field.field_key,
            "trigger_event": rule.trigger_event,
            "operator": rule.operator,
            "comparison_value": rule.comparison_value,
            "action_type": rule.action_type,
            "action_config": rule.action_config,
            "priority": rule.priority,
            "is_active": rule.is_active,
        }
        for rule in rules
    ]


@router.put("/forms/{form_id}/conditional-logic/rules/{rule_id}")
def update_conditional_logic_rule(
    form_id: UUID,
    rule_id: UUID,
    updates: ConditionalLogicRuleUpdate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Update a conditional logic rule"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    from app.models.form_platform import ConditionalLogic

    rule = db.query(ConditionalLogic).filter(
        ConditionalLogic.id == rule_id,
        ConditionalLogic.form_id == form_id,
    ).first()

    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")

    # Update fields if provided
    if updates.source_field_key:
        source_field = db.query(Field).filter(
            Field.form_id == form_id,
            Field.field_key == updates.source_field_key,
        ).first()
        if source_field:
            rule.source_field_id = source_field.id

    if updates.operator:
        rule.operator = updates.operator

    if updates.comparison_value is not None:
        rule.comparison_value = updates.comparison_value

    if updates.action_type:
        rule.action_type = updates.action_type

    if updates.action_config:
        target_field = db.query(Field).filter(
            Field.form_id == form_id,
            Field.field_key == updates.action_config.target_field_key,
        ).first()
        if target_field:
            rule.target_field_id = target_field.id
            rule.action_config = updates.action_config.model_dump()

    if updates.priority is not None:
        rule.priority = updates.priority

    if updates.is_active is not None:
        rule.is_active = updates.is_active

    if updates.trigger_event:
        rule.trigger_event = updates.trigger_event

    db.commit()
    db.refresh(rule)

    return {
        "id": rule.id,
        "source_field_key": rule.source_field.field_key,
        "trigger_event": rule.trigger_event,
        "operator": rule.operator,
        "comparison_value": rule.comparison_value,
        "action_type": rule.action_type,
        "action_config": rule.action_config,
        "priority": rule.priority,
        "is_active": rule.is_active,
        "updated_at": rule.updated_at.isoformat(),
    }


@router.delete("/forms/{form_id}/conditional-logic/rules/{rule_id}")
def delete_conditional_logic_rule(
    form_id: UUID,
    rule_id: UUID,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Delete a conditional logic rule"""
    form = db.query(Form).filter(Form.id == form_id, Form.owner_admin_id == admin.id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    from app.models.form_platform import ConditionalLogic

    rule = db.query(ConditionalLogic).filter(
        ConditionalLogic.id == rule_id,
        ConditionalLogic.form_id == form_id,
    ).first()

    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")

    db.delete(rule)
    db.commit()

    return {"deleted": True}
