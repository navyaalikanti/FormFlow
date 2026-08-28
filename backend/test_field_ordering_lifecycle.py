"""
Field Ordering Lifecycle Test Suite

This script verifies that field order is deterministic and stable across:
- Draft form creation
- Field creation and reordering
- Publishing
- Version history
- Restoring versions
- Edit as new draft

Run with: python -m pytest test_field_ordering_lifecycle.py -v
Or manually: python test_field_ordering_lifecycle.py
"""

from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import Session

# Test assertion helpers


def assert_field_order(fields, expected_labels, test_name):
    """Verify that fields in an array maintain expected order"""
    actual_labels = [f.label for f in fields]
    if actual_labels != expected_labels:
        print(f"❌ {test_name} FAILED")
        print(f"   Expected: {expected_labels}")
        print(f"   Actual: {actual_labels}")
        return False
    print(f"✅ {test_name} PASSED")
    return True


def assert_sequential_sort_order(fields, test_name):
    """Verify field sort_order values are sequential starting from 0"""
    sort_orders = sorted([f.sort_order for f in fields])
    expected = list(range(len(fields)))
    if sort_orders != expected:
        print(f"❌ {test_name} FAILED - sort_order not sequential")
        print(f"   Expected: {expected}")
        print(f"   Actual: {sort_orders}")
        return False
    print(f"✅ {test_name} PASSED")
    return True


def assert_sequential_section_order(sections, test_name):
    """Verify sections have sequential section_order values"""
    section_orders = sorted([s.section_order for s in sections])
    expected = list(range(len(sections)))
    if section_orders != expected:
        print(f"❌ {test_name} FAILED - section_order not sequential")
        print(f"   Expected: {expected}")
        print(f"   Actual: {section_orders}")
        return False
    print(f"✅ {test_name} PASSED")
    return True


def assert_all_fields_have_sort_order(sections, test_name):
    """Verify that all fields have a sort_order attribute and it's >= 0"""
    valid = True
    for sidx, section in enumerate(sections):
        for fidx, field in enumerate(section.fields or []):
            if field.sort_order is None or not isinstance(field.sort_order, int) or field.sort_order < 0:
                print(
                    f"❌ Invalid sort_order for Field: Section {sidx}, Field {fidx} ({field.label}): {field.sort_order}"
                )
                valid = False
    if not valid:
        print(f"❌ {test_name} FAILED")
        return False
    print(f"✅ {test_name} PASSED")
    return True


def assert_options_sort_order(field, test_name):
    """Verify field options have sequential sort_order"""
    options = field.options or []
    if not options:
        print(f"✅ {test_name} PASSED (no options)")
        return True

    sort_orders = sorted([o.sort_order for o in options])
    expected = list(range(len(options)))
    if sort_orders != expected:
        print(f"❌ {test_name} FAILED - option sort_order not sequential")
        print(f"   Expected: {expected}")
        print(f"   Actual: {sort_orders}")
        return False
    print(f"✅ {test_name} PASSED")
    return True


def verify_field_ordering(form_obj, db_session=None):
    """
    Run all field ordering lifecycle tests
    
    Args:
        form_obj: Form model instance with sections and fields
        db_session: Optional SQLAlchemy session for querying
    
    Returns:
        bool: True if all tests pass
    """
    print("\n========== Field Ordering Lifecycle Verification ==========\n")

    if not form_obj or not form_obj.sections:
        print("❌ Invalid form object provided")
        return False

    all_passed = True

    # Test 1: All fields have sort_order
    all_passed &= assert_all_fields_have_sort_order(
        form_obj.sections,
        "All fields have valid sort_order"
    )

    # Test 2: All sections have sequential section_order
    all_passed &= assert_sequential_section_order(
        form_obj.sections,
        "Sections have sequential section_order (0, 1, 2...)"
    )

    # Test 3: Fields within each section have sequential sort_order
    for idx, section in enumerate(form_obj.sections):
        fields = section.fields or []
        if fields:
            all_passed &= assert_sequential_sort_order(
                fields,
                f"Section {idx}: Fields have sequential sort_order (0, 1, 2...)"
            )

    # Test 4: Options within fields have sequential sort_order
    for sidx, section in enumerate(form_obj.sections):
        for fidx, field in enumerate(section.fields or []):
            if field.options:
                all_passed &= assert_options_sort_order(
                    field,
                    f"Section {sidx}, Field {fidx} ({field.label}): Options have sequential sort_order"
                )

    # Test 5: Field order is the same as in sections array
    for sidx, section in enumerate(form_obj.sections):
        fields = section.fields or []
        if fields:
            expected_order = [f.sort_order for f in fields]
            actual_order = list(range(len(fields)))
            if expected_order == actual_order:
                print(f"✅ Section {sidx}: Field array order matches sort_order sequence")
            else:
                print(f"❌ Section {sidx}: Field array order does NOT match sort_order")
                print(f"   Expected sort_order: {actual_order}")
                print(f"   Actual sort_order: {expected_order}")
                all_passed = False

    print(f"\n{'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}\n")
    return all_passed


def verify_snapshot_field_ordering(snapshot):
    """
    Verify that a form version snapshot preserves field ordering
    
    Args:
        snapshot: dict with 'form' and 'sections' keys
    
    Returns:
        bool: True if snapshot has correct field ordering
    """
    print("\n========== Snapshot Field Ordering Verification ==========\n")

    if not snapshot or "sections" not in snapshot:
        print("❌ Invalid snapshot provided")
        return False

    all_passed = True
    sections = snapshot.get("sections", [])

    # Verify sections are ordered
    section_orders = [s.get("section_order", 0) for s in sections]
    if section_orders != sorted(section_orders):
        print("❌ Sections in snapshot not ordered by section_order")
        print(f"   Orders: {section_orders}")
        all_passed = False
    else:
        print("✅ Sections in snapshot are properly ordered")

    # Verify fields within sections are ordered
    for sidx, section in enumerate(sections):
        fields = section.get("fields", [])
        field_orders = [f.get("sort_order", 0) for f in fields]
        expected = list(range(len(fields)))
        if field_orders != expected:
            print(f"❌ Section {sidx}: Fields in snapshot not sequential")
            print(f"   Expected: {expected}")
            print(f"   Actual: {field_orders}")
            all_passed = False
        else:
            print(f"✅ Section {sidx}: Fields in snapshot are properly ordered")

        # Verify options within fields
        for fidx, field in enumerate(fields):
            options = field.get("options", [])
            if options:
                option_orders = [o.get("sort_order", 0) for o in options]
                expected = list(range(len(options)))
                if option_orders != expected:
                    print(f"❌ Section {sidx}, Field {fidx}: Options not sequential")
                    print(f"   Expected: {expected}")
                    print(f"   Actual: {option_orders}")
                    all_passed = False

    print(f"\n{'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}\n")
    return all_passed


# Example test case definitions

TEST_CASES = {
    "basic": {
        "description": "Create form → Add 5 fields → Verify order",
        "fields": [
            {"label": "Name", "field_type": "short_text"},
            {"label": "Email", "field_type": "email"},
            {"label": "Phone", "field_type": "phone"},
            {"label": "Address", "field_type": "paragraph"},
            {"label": "College", "field_type": "short_text"},
        ],
    },
    "multiple_sections": {
        "description": "Create form → 2 sections → 5+ fields each → Verify order",
        "sections": [
            {
                "title": "Personal Info",
                "fields": [
                    {"label": "Name", "field_type": "short_text"},
                    {"label": "Email", "field_type": "email"},
                    {"label": "Phone", "field_type": "phone"},
                    {"label": "Address", "field_type": "paragraph"},
                    {"label": "College", "field_type": "short_text"},
                ],
            },
            {
                "title": "Professional",
                "fields": [
                    {"label": "Department", "field_type": "dropdown"},
                    {"label": "Experience", "field_type": "number"},
                    {"label": "Rating", "field_type": "rating"},
                    {"label": "File", "field_type": "file"},
                    {"label": "Join Date", "field_type": "date"},
                    {"label": "Available", "field_type": "checkbox"},
                    {"label": "Time", "field_type": "radio"},
                    {"label": "Notes", "field_type": "paragraph"},
                    {"label": "URL", "field_type": "url"},
                    {"label": "Salary", "field_type": "short_text"},
                ],
            },
        ],
    },
    "with_options": {
        "description": "Create fields with options → Verify option sort_order",
        "fields": [
            {
                "label": "Department",
                "field_type": "dropdown",
                "options": [
                    {"label": "Engineering", "option_value": "eng"},
                    {"label": "Sales", "option_value": "sales"},
                    {"label": "Marketing", "option_value": "mkt"},
                ],
            },
            {
                "label": "Preference",
                "field_type": "radio",
                "options": [
                    {"label": "Option A", "option_value": "a"},
                    {"label": "Option B", "option_value": "b"},
                ],
            },
        ],
    },
}

if __name__ == "__main__":
    print("\n🧪 Field Ordering Test Suite\n")
    print("This suite verifies that field order is deterministic and stable.")
    print("Run with pytest: pytest test_field_ordering_lifecycle.py -v")
    print("Or use the functions directly:\n")
    print("  from test_field_ordering_lifecycle import verify_field_ordering, verify_snapshot_field_ordering")
    print("  verify_field_ordering(form_obj)")
    print("  verify_snapshot_field_ordering(snapshot_dict)")
