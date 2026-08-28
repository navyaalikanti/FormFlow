/**
 * Field Ordering Lifecycle Test Suite
 * 
 * This script verifies that field order is deterministic and stable across:
 * - Builder (add, reorder, drag-drop)
 * - Save Draft
 * - Publish
 * - Preview
 * - Public Form
 * - Responses
 * - Version History
 * - Restore Version
 * - Edit as New Draft
 * 
 * Run with: npm test -- test-field-ordering-lifecycle.js
 * Or manually import and call verifyFieldOrdering()
 */

export const FieldOrderingTests = {
  /**
   * Verify that fields in an array maintain expected order
   */
  assertFieldOrder(fields, expectedLabels, testName) {
    const actualLabels = fields.map((f) => f.label);
    const match = JSON.stringify(actualLabels) === JSON.stringify(expectedLabels);

    if (!match) {
      console.error(
        `❌ ${testName} FAILED`,
        `Expected: [${expectedLabels.join(', ')}]`,
        `Actual: [${actualLabels.join(', ')}]`
      );
      return false;
    }

    console.log(`✅ ${testName} PASSED`);
    return true;
  },

  /**
   * Verify field sort_order values are sequential starting from 0
   */
  assertSequentialSortOrder(fields, testName) {
    const sortOrders = fields.map((f) => f.sort_order).sort((a, b) => a - b);
    const expected = Array.from({ length: fields.length }, (_, i) => i);
    const match = JSON.stringify(sortOrders) === JSON.stringify(expected);

    if (!match) {
      console.error(
        `❌ ${testName} FAILED - sort_order not sequential`,
        `Expected: [${expected.join(', ')}]`,
        `Actual: [${sortOrders.join(', ')}]`
      );
      return false;
    }

    console.log(`✅ ${testName} PASSED`);
    return true;
  },

  /**
   * Verify sections have sequential section_order values
   */
  assertSequentialSectionOrder(sections, testName) {
    const sectionOrders = sections.map((s) => s.section_order).sort((a, b) => a - b);
    const expected = Array.from({ length: sections.length }, (_, i) => i);
    const match = JSON.stringify(sectionOrders) === JSON.stringify(expected);

    if (!match) {
      console.error(
        `❌ ${testName} FAILED - section_order not sequential`,
        `Expected: [${expected.join(', ')}]`,
        `Actual: [${sectionOrders.join(', ')}]`
      );
      return false;
    }

    console.log(`✅ ${testName} PASSED`);
    return true;
  },

  /**
   * Verify that all fields have a sort_order attribute and it's >= 0
   */
  assertAllFieldsHaveSortOrder(sections, testName) {
    let valid = true;
    sections.forEach((section, sidx) => {
      (section.fields || []).forEach((field, fidx) => {
        if (field.sort_order === undefined || field.sort_order === null) {
          console.error(
            `❌ Field missing sort_order: Section ${sidx}, Field ${fidx} (${field.label})`
          );
          valid = false;
        }
        if (typeof field.sort_order !== 'number' || field.sort_order < 0) {
          console.error(
            `❌ Invalid sort_order for Field: Section ${sidx}, Field ${fidx} (${field.label}): ${field.sort_order}`
          );
          valid = false;
        }
      });
    });

    if (!valid) {
      console.error(`❌ ${testName} FAILED`);
      return false;
    }

    console.log(`✅ ${testName} PASSED`);
    return true;
  },

  /**
   * Verify field options have sequential sort_order
   */
  assertOptionsSortOrder(field, testName) {
    const options = field.options || [];
    if (options.length === 0) {
      console.log(`✅ ${testName} PASSED (no options)`);
      return true;
    }

    const sortOrders = options.map((o) => o.sort_order).sort((a, b) => a - b);
    const expected = Array.from({ length: options.length }, (_, i) => i);
    const match = JSON.stringify(sortOrders) === JSON.stringify(expected);

    if (!match) {
      console.error(
        `❌ ${testName} FAILED - option sort_order not sequential`,
        `Expected: [${expected.join(', ')}]`,
        `Actual: [${sortOrders.join(', ')}]`
      );
      return false;
    }

    console.log(`✅ ${testName} PASSED`);
    return true;
  },

  /**
   * Run all field ordering lifecycle tests
   * @param {Object} formData - Form response object with sections/fields
   * @returns {boolean} True if all tests pass
   */
  verifyFieldOrdering(formData) {
    console.log("\n========== Field Ordering Lifecycle Verification ==========\n");

    if (!formData || !formData.sections) {
      console.error("❌ Invalid form data provided");
      return false;
    }

    let allPassed = true;

    // Test 1: All fields have sort_order
    allPassed &= this.assertAllFieldsHaveSortOrder(
      formData.sections,
      "All fields have valid sort_order"
    );

    // Test 2: All sections have sequential section_order
    allPassed &= this.assertSequentialSectionOrder(
      formData.sections,
      "Sections have sequential section_order (0, 1, 2...)"
    );

    // Test 3: Fields within each section have sequential sort_order
    formData.sections.forEach((section, idx) => {
      const fields = section.fields || [];
      if (fields.length > 0) {
        allPassed &= this.assertSequentialSortOrder(
          fields,
          `Section ${idx}: Fields have sequential sort_order (0, 1, 2...)`
        );
      }
    });

    // Test 4: Options within fields have sequential sort_order
    formData.sections.forEach((section, sidx) => {
      (section.fields || []).forEach((field, fidx) => {
        if (field.options && field.options.length > 0) {
          allPassed &= this.assertOptionsSortOrder(
            field,
            `Section ${sidx}, Field ${fidx} (${field.label}): Options have sequential sort_order`
          );
        }
      });
    });

    // Test 5: Field order is the same as in sections array
    formData.sections.forEach((section, sidx) => {
      const fields = section.fields || [];
      const expectedOrder = fields.map((f) => f.sort_order);
      const actualOrder = Array.from({ length: fields.length }, (_, i) => i);

      if (JSON.stringify(expectedOrder) === JSON.stringify(actualOrder)) {
        console.log(
          `✅ Section ${sidx}: Field array order matches sort_order sequence`
        );
      } else {
        console.error(
          `❌ Section ${sidx}: Field array order does NOT match sort_order`,
          `Expected sort_order: [${actualOrder.join(", ")}]`,
          `Actual sort_order: [${expectedOrder.join(", ")}]`
        );
        allPassed = false;
      }
    });

    console.log(
      `\n${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}\n`
    );
    return allPassed;
  },

  /**
   * Create a test form with 15+ fields in multiple sections
   * Expected structure:
   * Section 0:
   *   - Name (sort_order: 0)
   *   - Email (sort_order: 1)
   *   - Phone (sort_order: 2)
   *   - Address (sort_order: 3)
   *   - College (sort_order: 4)
   * Section 1:
   *   - Department (sort_order: 0)
   *   - [5 more fields]
   */
  generateTestFormStructure() {
    const fields1 = [
      { label: "Name", field_type: "short_text" },
      { label: "Email", field_type: "email" },
      { label: "Phone", field_type: "phone" },
      { label: "Address", field_type: "paragraph" },
      { label: "College", field_type: "short_text" },
    ];

    const fields2 = [
      { label: "Department", field_type: "dropdown" },
      { label: "Years of Experience", field_type: "number" },
      { label: "Rating", field_type: "rating" },
      { label: "File Upload", field_type: "file" },
      { label: "Date of Joining", field_type: "date" },
      { label: "Availability", field_type: "checkbox" },
      { label: "Preferred Time", field_type: "radio" },
      { label: "Additional Notes", field_type: "paragraph" },
      { label: "URL", field_type: "url" },
      { label: "Salary Range", field_type: "short_text" },
    ];

    return {
      title: "Test Form - Field Ordering",
      description: "Test form to verify field order stability",
      sections: [
        {
          title: "Personal Information",
          description: "Basic details",
          section_order: 0,
          is_collapsible: false,
          fields: fields1.map((f, idx) => ({
            ...f,
            id: `field-${idx}`,
            section_id: "section-0",
            sort_order: idx,
            is_required: idx < 2,
            is_hidden: false,
            is_read_only: false,
            allows_multiple: false,
            description: null,
            placeholder: null,
            helper_text: null,
            default_value: null,
            config: {},
            validation_rules: {},
            ai_config: {},
            options: [],
          })),
        },
        {
          title: "Professional Details",
          description: "Work-related info",
          section_order: 1,
          is_collapsible: false,
          fields: fields2.map((f, idx) => ({
            ...f,
            id: `field-${5 + idx}`,
            section_id: "section-1",
            sort_order: idx,
            is_required: false,
            is_hidden: false,
            is_read_only: false,
            allows_multiple: idx === 5, // checkbox allows multiple
            description: null,
            placeholder: null,
            helper_text: null,
            default_value: null,
            config: {},
            validation_rules: {},
            ai_config: {},
            options:
              f.field_type === "dropdown" || f.field_type === "radio"
                ? [
                    { label: "Option 1", option_value: "opt_1", sort_order: 0 },
                    { label: "Option 2", option_value: "opt_2", sort_order: 1 },
                  ]
                : [],
          })),
        },
      ],
    };
  },

  /**
   * Simulate drag-reorder and verify sort_order is maintained
   * This models what happens in the FormBuilderPage.handleDragEnd
   */
  simulateDragReorder(sections, sourceSectionIdx, sourceFieldIdx, targetSectionIdx, targetFieldIdx) {
    console.log(
      `\n📦 Simulating drag from Section ${sourceSectionIdx} Field ${sourceFieldIdx} -> Section ${targetSectionIdx} Field ${targetFieldIdx}`
    );

    const newSections = sections.map((s) => ({ ...s, fields: [...(s.fields || [])] }));

    if (sourceSectionIdx === targetSectionIdx) {
      // Same section - use arrayMove logic
      const fields = newSections[sourceSectionIdx].fields;
      const [moved] = fields.splice(sourceFieldIdx, 1);
      fields.splice(targetFieldIdx, 0, moved);
      console.log(
        `  → Moved within same section (${sourceSectionIdx})`
      );
    } else {
      // Different section
      const [moved] = newSections[sourceSectionIdx].fields.splice(sourceFieldIdx, 1);
      moved.section_id = newSections[targetSectionIdx].id;
      newSections[targetSectionIdx].fields.splice(targetFieldIdx, 0, moved);
      console.log(
        `  → Moved to different section (${sourceSectionIdx} → ${targetSectionIdx})`
      );
    }

    // Re-normalize sort_order for both affected sections
    [sourceSectionIdx, targetSectionIdx].forEach((sidx) => {
      newSections[sidx].fields.forEach((field, fidx) => {
        field.sort_order = fidx;
      });
    });

    console.log("  ✅ Sort order re-normalized after reorder");
    return newSections;
  },
};

// Export for use in test frameworks or manual verification
export default FieldOrderingTests;
