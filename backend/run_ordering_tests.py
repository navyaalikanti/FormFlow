#!/usr/bin/env python
"""Run field ordering tests."""
import sys
sys.path.insert(0, '.')

from tests.test_field_ordering_lifecycle import (
    test_initial_field_creation_preserves_order,
    test_field_reordering_persists,
    test_publish_preserves_field_order_in_snapshot,
    test_public_form_returns_fields_in_correct_order,
    test_preview_matches_builder_order,
    test_restore_version_preserves_original_order,
    test_edit_as_new_draft_preserves_order,
    test_duplicate_form_preserves_order,
    test_complete_lifecycle_field_order_is_stable,
    test_form_response_ordering_respects_field_order,
)

if __name__ == "__main__":
    try:
        test_initial_field_creation_preserves_order()
        print("✓ Test 1: Initial field creation preserves order")
        
        test_field_reordering_persists()
        print("✓ Test 2: Field reordering persists correctly")
        
        test_publish_preserves_field_order_in_snapshot()
        print("✓ Test 3: Publish preserves field order in snapshot")
        
        test_public_form_returns_fields_in_correct_order()
        print("✓ Test 4: Public form returns fields in correct order")
        
        test_preview_matches_builder_order()
        print("✓ Test 5: Preview matches builder order")
        
        test_restore_version_preserves_original_order()
        print("✓ Test 6: Restoring version preserves its original order")
        
        test_edit_as_new_draft_preserves_order()
        print("✓ Test 7: Edit as new draft preserves order")
        
        test_duplicate_form_preserves_order()
        print("✓ Test 8: Duplicate form preserves order")
        
        test_complete_lifecycle_field_order_is_stable()
        print("✓ Test 9: Complete lifecycle - field order is stable")
        
        test_form_response_ordering_respects_field_order()
        print("✓ Test 10: Form response ordering respects field order")
        
        print()
        print("✅ All 10 field ordering tests PASSED!")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Test failed with error:")
        print(f"{type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
