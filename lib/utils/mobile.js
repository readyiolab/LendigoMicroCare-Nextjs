/** Normalize Indian mobile to 10 digits (+91, spaces, leading 0). */
export function normalizeIndianMobile(mobile) {
  if (mobile === null || mobile === undefined) return '';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function isValidIndianMobile(mobile) {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(mobile));
}

/** Login + eligibility + alternate mobiles the applicant must not reuse as references. */
export function getApplicantForbiddenMobiles(applicationData) {
  const forbidden = new Set();
  const add = (mobile) => {
    const normalized = normalizeIndianMobile(mobile);
    if (normalized.length === 10) {
      forbidden.add(normalized);
    }
  };

  add(applicationData?.profile?.mobile);
  add(applicationData?.user?.mobile);
  add(applicationData?.profile?.alternate_mobile);
  add(applicationData?.alternate_mobile);

  return forbidden;
}

/**
 * Friendly uniqueness checks for admin Customer tab (primary / alternate / references).
 */
export function validateProfileContactUniqueness({
  candidate,
  role,
  primaryMobile,
  alternateMobile,
  references = [],
  excludeReferenceId = null,
}) {
  const n = normalizeIndianMobile(candidate);
  if (!n) {
    return role === 'alternate' ? '' : 'Enter a valid 10-digit mobile number starting with 6-9';
  }
  if (!isValidIndianMobile(n)) {
    return 'Enter a valid 10-digit mobile number starting with 6-9';
  }

  const primary = normalizeIndianMobile(primaryMobile);
  const alternate = normalizeIndianMobile(alternateMobile);
  const refMobiles = (references || [])
    .filter((r) => !excludeReferenceId || Number(r.id) !== Number(excludeReferenceId))
    .map((r) => normalizeIndianMobile(r.reference_mobile))
    .filter((m) => m.length === 10);

  if (role === 'alternate') {
    if (primary && n === primary) {
      return 'This number is already used as the primary mobile. Use a different number.';
    }
    if (refMobiles.includes(n)) {
      return 'This number is already used as a reference. Use a different number.';
    }
  }

  if (role === 'primary') {
    if (alternate && n === alternate) {
      return 'This number is already used as the alternate mobile. Use a different number.';
    }
    if (refMobiles.includes(n)) {
      return 'This number is already used as a reference. Use a different number.';
    }
  }

  if (role === 'reference') {
    if (primary && n === primary) {
      return 'This number is already used as the primary mobile. Use a different contact.';
    }
    if (alternate && n === alternate) {
      return 'This number is already used as the alternate mobile. Use a different contact.';
    }
    if (refMobiles.includes(n)) {
      return 'This number is already used as another reference. Use a different contact.';
    }
  }

  return '';
}

export function validateReferenceMobiles({ ref1Mobile, ref2Mobile, forbiddenMobiles }) {
  const errors = {};
  const n1 = normalizeIndianMobile(ref1Mobile);
  const n2 = normalizeIndianMobile(ref2Mobile);

  if (!isValidIndianMobile(n1)) {
    errors.ref1Mobile = 'Enter a valid 10-digit mobile number starting with 6-9';
  }
  if (!isValidIndianMobile(n2)) {
    errors.ref2Mobile = 'Enter a valid 10-digit mobile number starting with 6-9';
  }

  if (forbiddenMobiles.has(n1)) {
    errors.ref1Mobile =
      'This number is already used in your application (primary or alternate mobile). Use a different contact.';
  }
  if (forbiddenMobiles.has(n2)) {
    errors.ref2Mobile =
      'This number is already used in your application (primary or alternate mobile). Use a different contact.';
  }

  if (n1 && n2 && n1 === n2) {
    errors.ref2Mobile = 'Reference mobile numbers must be different from each other';
  }

  return errors;
}
