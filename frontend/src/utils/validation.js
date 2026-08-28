/**
 * Client-side validation engine for FormFlow
 */

/**
 * Validators for each field type
 */
function getOptionValue(option) {
  if (option && typeof option === 'object') {
    return option.option_value ?? option.value ?? option.id ?? option.label
  }

  return option
}

function getAllowedOptionValues(field) {
  return (field?.options || [])
    .map(getOptionValue)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value))
}

function validateChoiceValue(value, rules, field, allowMultiple = false) {
  const errors = []
  const allowedValues = getAllowedOptionValues(field)

  if (allowedValues.length === 0 || value === null || value === undefined || value === '') {
    return errors
  }

  if (allowMultiple) {
    const selectedValues = Array.isArray(value) ? value : [value]
    const invalidValues = selectedValues
      .map((item) => String(item))
      .filter((item) => !allowedValues.includes(item))

    if (invalidValues.length > 0) {
      errors.push({
        type: 'invalid_choice',
        message: rules.choice_message || 'One or more selected options are invalid',
      })
    }

    return errors
  }

  const selectedValue = String(value)
  if (!allowedValues.includes(selectedValue)) {
    errors.push({
      type: 'invalid_choice',
      message: rules.choice_message || 'Selected option is invalid',
    })
  }

  return errors
}

const FIELD_VALIDATORS = {
  short_text: validateTextfield,
  paragraph: validateTextfield,
  number: validateNumber,
  email: validateEmail,
  phone: validatePhone,
  url: validateURL,
  date: validateDate,
  time: validateTime,
  rating: validateRating,
  file: validateFileUpload,
  dropdown: (value, rules, field) => validateChoiceValue(value, rules, field, false),
  radio: (value, rules, field) => validateChoiceValue(value, rules, field, false),
  checkbox: (value, rules, field) => validateChoiceValue(value, rules, field, true),
};

function validateTextfield(value, rules) {
  const errors = [];

  // Handle empty values
  if (value === null || value === undefined || value === "") {
    return errors;
  }

  const strValue = String(value);

  // Min length
  if (rules.min_length !== undefined && rules.min_length !== null) {
    if (strValue.length < rules.min_length) {
      errors.push({
        type: "min_length",
        message: rules.min_length_message || `Minimum ${rules.min_length} characters required`,
      });
    }
  }

  // Max length
  if (rules.max_length !== undefined && rules.max_length !== null) {
    if (strValue.length > rules.max_length) {
      errors.push({
        type: "max_length",
        message: rules.max_length_message || `Maximum ${rules.max_length} characters allowed`,
      });
    }
  }

  // Pattern
  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(strValue)) {
        errors.push({
          type: "pattern",
          message: rules.pattern_message || "Invalid format",
        });
      }
    } catch (e) {
      // Invalid regex
    }
  }

  return errors;
}

function validateNumber(value, rules) {
  const errors = [];

  if (value === null || value === undefined || value === "") {
    return errors;
  }

  let num;
  try {
    num = Number(value);
    if (isNaN(num)) throw new Error();
  } catch {
    errors.push({
      type: "invalid_number",
      message: "Value must be a valid number",
    });
    return errors;
  }

  // Integer only
  if (rules.integer_only && num !== Math.floor(num)) {
    errors.push({
      type: "not_integer",
      message: rules.integer_message || "Value must be a whole number",
    });
  }

  // Positive only
  if (rules.positive_only && num <= 0) {
    errors.push({
      type: "not_positive",
      message: rules.positive_message || "Value must be positive",
    });
  }

  // Negative only
  if (rules.negative_only && num >= 0) {
    errors.push({
      type: "not_negative",
      message: rules.negative_message || "Value must be negative",
    });
  }

  // Min value
  if (rules.min_value !== undefined && rules.min_value !== null && num < rules.min_value) {
    errors.push({
      type: "below_minimum",
      message: rules.min_value_message || `Minimum value is ${rules.min_value}`,
    });
  }

  // Max value
  if (rules.max_value !== undefined && rules.max_value !== null && num > rules.max_value) {
    errors.push({
      type: "above_maximum",
      message: rules.max_value_message || `Maximum value is ${rules.max_value}`,
    });
  }

  // Step
  if (rules.step && rules.step > 0) {
    const remainder = num % rules.step;
    if (Math.abs(remainder) > 1e-10) {
      errors.push({
        type: "invalid_step",
        message: rules.step_message || `Value must be a multiple of ${rules.step}`,
      });
    }
  }

  return errors;
}

function validateEmail(value, rules) {
  const errors = [];

  if (value === null || value === undefined || value === "") {
    return errors;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(value))) {
    errors.push({
      type: "invalid_email",
      message: rules.email_message || "Invalid email address",
    });
  }

  return errors;
}

function validatePhone(value, rules) {
  const errors = [];

  if (value === null || value === undefined || value === "") {
    return errors;
  }

  const cleaned = String(value).replace(/[\s\-\(\)\+\.]/g, "");
  if (!/^\d{7,}$/.test(cleaned)) {
    errors.push({
      type: "invalid_phone",
      message: rules.phone_message || "Invalid phone number",
    });
  }

  return errors;
}

function validateURL(value, rules) {
  const errors = [];

  if (value === null || value === undefined || value === "") {
    return errors;
  }

  try {
    new URL(String(value));
  } catch {
    errors.push({
      type: "invalid_url",
      message: rules.url_message || "Invalid URL",
    });
  }

  return errors;
}

function validateDate(value, rules) {
  const errors = [];

  if (value === null || value === undefined || value === "") {
    return errors;
  }

  let dateValue;
  try {
    dateValue = new Date(String(value));
    if (isNaN(dateValue.getTime())) throw new Error();
  } catch {
    errors.push({
      type: "invalid_date",
      message: "Value must be a valid date",
    });
    return errors;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Min date
  if (rules.min_date) {
    try {
      const minDate = new Date(rules.min_date);
      if (dateValue < minDate) {
        errors.push({
          type: "before_minimum_date",
          message: rules.min_date_message || `Date must be on or after ${rules.min_date}`,
        });
      }
    } catch (e) {
      // Invalid min_date
    }
  }

  // Max date
  if (rules.max_date) {
    try {
      const maxDate = new Date(rules.max_date);
      if (dateValue > maxDate) {
        errors.push({
          type: "after_maximum_date",
          message: rules.max_date_message || `Date must be on or before ${rules.max_date}`,
        });
      }
    } catch (e) {
      // Invalid max_date
    }
  }

  // Disable past dates
  if (rules.disable_past_dates && dateValue < today) {
    errors.push({
      type: "past_date_not_allowed",
      message: rules.past_dates_message || "Past dates are not allowed",
    });
  }

  // Disable future dates
  if (rules.disable_future_dates && dateValue > today) {
    errors.push({
      type: "future_date_not_allowed",
      message: rules.future_dates_message || "Future dates are not allowed",
    });
  }

  return errors;
}

function validateTime(value, rules) {
  const errors = [];

  if (value === null || value === undefined || value === "") {
    return errors;
  }

  const strValue = String(value);
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

  if (!timeRegex.test(strValue)) {
    errors.push({
      type: "invalid_time",
      message: "Value must be a valid time in HH:MM format",
    });
    return errors;
  }

  const toSeconds = (timeString) => {
    const [hours, minutes, seconds = '0'] = timeString.split(':').map(Number)
    return hours * 3600 + minutes * 60 + seconds
  }

  const valueSeconds = toSeconds(strValue.padStart(5, '0'))

  // Min time
  if (rules.min_time && valueSeconds < toSeconds(String(rules.min_time).padStart(5, '0'))) {
    errors.push({
      type: "before_minimum_time",
      message: rules.min_time_message || `Time must be on or after ${rules.min_time}`,
    });
  }

  // Max time
  if (rules.max_time) {
    if (valueSeconds > toSeconds(String(rules.max_time).padStart(5, '0'))) {
      errors.push({
        type: "after_maximum_time",
        message: rules.max_time_message || `Time must be on or before ${rules.max_time}`,
      });
    }
  }

  return errors;
}

function validateRating(value, rules) {
  const errors = [];

  if (value === null || value === undefined || value === "") {
    return errors;
  }

  let rating;
  try {
    rating = Number(value);
    if (isNaN(rating) || !Number.isInteger(rating)) throw new Error();
  } catch {
    errors.push({
      type: "invalid_rating",
      message: "Rating must be a number",
    });
    return errors;
  }

  const maxStars = rules.max_stars || 5;

  if (rating < 1 || rating > maxStars) {
    errors.push({
      type: "invalid_rating_range",
      message: rules.rating_message || `Rating must be between 1 and ${maxStars}`,
    });
  }

  return errors;
}

function validateFileUpload(value, rules) {
  const errors = [];

  if (value === null || value === undefined) {
    return errors;
  }

  const minCount = Number.isFinite(rules.min_file_count) ? rules.min_file_count : null;
  const maxCount = Number.isFinite(rules.max_file_count) ? rules.max_file_count : null;

  // Handle single file
  if (value instanceof File) {
    return validateSingleFile(value, rules);
  }

  // Handle file list or array
  if (Array.isArray(value)) {
    // Check min/max file count
    if (minCount !== null && value.length < minCount) {
      errors.push({
        type: "too_few_files",
        message: rules.min_count_message || `Minimum ${minCount} files required`,
      });
    }

    if (maxCount !== null && value.length > maxCount) {
      errors.push({
        type: "too_many_files",
        message: rules.max_count_message || `Maximum ${maxCount} files allowed`,
      });
    }

    // Validate each file
    for (const file of value) {
      if (file instanceof File) {
        const fileErrors = validateSingleFile(file, rules);
        errors.push(...fileErrors);
      } else if (typeof file === "string" && !file.trim()) {
        errors.push({
          type: "invalid_file_reference",
          message: "Empty file reference is not allowed",
        });
      }
    }

    return errors;
  }

  if (typeof value === "string") {
    if (minCount !== null && minCount > 1) {
      errors.push({
        type: "too_few_files",
        message: rules.min_count_message || `Minimum ${minCount} files required`,
      });
    }
    return errors;
  }

  return errors;
}

function validateSingleFile(file, rules) {
  const errors = [];

  if (!(file instanceof File)) {
    return errors;
  }

  // Check file size
  if (rules.max_file_size_mb) {
    const maxBytes = rules.max_file_size_mb * 1024 * 1024;
    if (file.size > maxBytes) {
      errors.push({
        type: "file_too_large",
        message:
          rules.max_size_message || `File size must not exceed ${rules.max_file_size_mb}MB`,
      });
    }
  }

  // Check allowed extensions
  if (rules.allowed_extensions && rules.allowed_extensions.length > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!rules.allowed_extensions.includes(ext)) {
      errors.push({
        type: "invalid_extension",
        message:
          rules.extension_message || `Only ${rules.allowed_extensions.join(", ")} files are allowed`,
      });
    }
  }

  // Check allowed MIME types
  if (rules.allowed_file_types && rules.allowed_file_types.length > 0) {
    const mimeMatch = rules.allowed_file_types.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.replace("/*", ""));
      }
      return file.type === type;
    });

    if (!mimeMatch) {
      errors.push({
        type: "invalid_file_type",
        message:
          rules.file_type_message ||
          `Only files of type ${rules.allowed_file_types.join(", ")} are allowed`,
      });
    }
  }

  return errors;
}

/**
 * Validate a field value against its rules
 */
export function validateField(value, fieldType, validationRules = {}, field = null) {
  const validator = FIELD_VALIDATORS[fieldType];
  if (!validator) {
    return [];
  }
  return validator(value, validationRules, field);
}

/**
 * Validate all field values in a response
 */
export function validateFormResponse(answers, fields) {
  const errors = {};

  for (const field of fields) {
    const { field_key, field_type, validation_rules, is_required } = field;
    const value = answers[field_key];

    if (field.is_hidden) {
      continue;
    }

    // Check required
    if (
      is_required &&
      (value === null || value === undefined || value === "" ||
        (Array.isArray(value) && value.length === 0))
    ) {
      errors[field_key] = [
        {
          type: "required",
          message: `${field_key} is required`,
        },
      ];
      continue;
    }

    // Skip empty non-required fields
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      continue;
    }

    // Validate against rules
    const fieldErrors = validateField(value, field_type, validation_rules, field);
    if (fieldErrors.length > 0) {
      errors[field_key] = fieldErrors;
    }
  }

  return errors;
}

/**
 * Check if there are any validation errors
 */
export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}

/**
 * Get error message for a field
 */
export function getFieldErrorMessage(errors, fieldKey) {
  const fieldErrors = errors[fieldKey];
  if (!fieldErrors || fieldErrors.length === 0) {
    return null;
  }
  return fieldErrors[0].message;
}

/**
 * Get all error messages for a field
 */
export function getFieldErrorMessages(errors, fieldKey) {
  const fieldErrors = errors[fieldKey];
  if (!fieldErrors) {
    return [];
  }
  return fieldErrors.map((e) => e.message);
}
