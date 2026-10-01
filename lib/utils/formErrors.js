/**
 * Utility functions for handling form errors with smooth scrolling
 */

/**
 * Scrolls smoothly to the first error field and focuses it
 * @param {Object} errors - Object with field names as keys and error messages as values
 */
export const scrollToFirstError = (errors) => {
    if (!errors || Object.keys(errors).length === 0) return;

    // Wait for React to render the error states
    setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
            // Try different selectors to find the best element to scroll to
            let element = document.querySelector(`[name="${firstErrorField}"]`);

            // If not found, try by id
            if (!element) {
                element = document.getElementById(firstErrorField);
            }

            // For Radix UI Select or other custom components, the 'name' attribute 
            // might be on a hidden input. We should look for the closest visible container or label.
            if (element && element.offsetParent === null) {
                // If the element is hidden, try to find a parent with a 'data-radix-collection-item' or a trigger
                const container = element.closest('.space-y-1.5, .grid-cols-1, .space-y-4');
                if (container) element = container;
            }

            if (!element) {
                element = document.querySelector(`[data-field="${firstErrorField}"]`);
            }

            if (element) {
                // Scroll with a generous offset to account for fixed headers
                const yOffset = -150; 
                const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                
                window.scrollTo({ top: y, behavior: 'smooth' });

                // Highlight effect (optional, can add a class that pulses)
                element.classList.add('error-shake');
                setTimeout(() => element.classList.remove('error-shake'), 1000);

                // Focus after scroll animation
                setTimeout(() => {
                    const focusable = element.querySelector('input, select, textarea, button') || element;
                    if (focusable && typeof focusable.focus === 'function') {
                        focusable.focus();
                    }
                }, 500);
            }
        }
    }, 150);
};

const NON_FIELD_ERROR_PATHS = new Set(['general', '']);

const mapMessageToField = (message) => {
    if (!message) return null;

    const msg = message.toLowerCase();
    const mapping = {
        mobile: ['mobile', 'phone', 'contact number'],
        pancard: ['pan', 'pancard'],
        personalEmail: ['email', 'personal email', 'linked with another'],
        dob: ['dob', 'date of birth', 'age'],
        netMonthlyIncome: ['income', 'salary', 'monthly income'],
        pincode: ['pincode', 'zip'],
        companyName: ['company'],
    };

    for (const [field, keywords] of Object.entries(mapping)) {
        if (keywords.some((keyword) => msg.includes(keyword))) {
            return field;
        }
    }

    return null;
};

const appendGeneralError = (current, next) => {
    if (!next) return current;
    if (!current) return next;
    return current.includes(next) ? current : `${current} ${next}`;
};

const isFormFieldPath = (path) => path && !NON_FIELD_ERROR_PATHS.has(path);

const collectErrorsFromList = (errors, result) => {
    errors.forEach((error) => {
        const msg = error.msg || error.message;
        if (!msg) return;

        if (isFormFieldPath(error.path)) {
            result.fieldErrors[error.path] = msg;
            return;
        }

        result.generalError = appendGeneralError(result.generalError, msg);
    });
};

const finalizeFormErrors = (result) => {
    if (result.generalError && Object.keys(result.fieldErrors).length === 0) {
        const mappedField = mapMessageToField(result.generalError);
        if (mappedField) {
            result.fieldErrors[mappedField] = result.generalError;
            result.generalError = 'Please fix the highlighted error below';
            return result;
        }
    }

    if (Object.keys(result.fieldErrors).length > 0) {
        result.generalError = result.generalError || 'Please fix the highlighted errors below';
    }

    return result;
};

/**
 * Processes API error response and extracts field errors
 * @param {Error} err - The error object from API call
 * @returns {Object} Object with fieldErrors and generalError
 */
export const processApiError = (err) => {
    const result = {
        fieldErrors: {},
        generalError: ''
    };

    // Check for validation errors in response.data.errors array
    if (err.response?.data?.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
        collectErrorsFromList(err.response.data.errors, result);
        if (!result.generalError && Object.keys(result.fieldErrors).length === 0) {
            result.generalError = err.response.data.errors[0].msg || err.response.data.message || '';
        }
    }
    // Check for errors array directly on error object (axios interceptor shape)
    else if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        collectErrorsFromList(err.errors, result);
        if (!result.generalError && Object.keys(result.fieldErrors).length === 0) {
            result.generalError = err.errors[0].msg || err.message || '';
        }
    }
    // Fallback to general error message
    else {
        result.generalError = err.response?.data?.message || err.message || 'An error occurred. Please try again.';
    }

    return finalizeFormErrors(result);
};

/**
 * Combined function to process errors and scroll to first error
 * @param {Error} err - The error object from API call
 * @param {Function} setFieldErrors - State setter for field errors
 * @param {Function} setError - State setter for general error
 */
export const handleFormError = (err, setFieldErrors, setError) => {
    const { fieldErrors, generalError } = processApiError(err);

    setFieldErrors(fieldErrors);
    setError(generalError);

    // Scroll to first error if there are field errors
    if (Object.keys(fieldErrors).length > 0) {
        scrollToFirstError(fieldErrors);
    }
};
