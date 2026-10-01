/**
 * Format loan application timestamps for admin/customer UI (IST locale).
 */
export function formatApplicationDateTime(value, options = {}) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

export function getApplicationAppliedAt(application) {
  if (!application) return null;
  return application.submitted_at || application.submittedAt || null;
}

export function getApplicationStartedAt(application) {
  if (!application) return null;
  return application.created_at || application.createdAt || null;
}

/** Label + formatted value for display (submitted time preferred over draft created time). */
export function formatApplicationAppliedLabel(application) {
  const appliedAt = getApplicationAppliedAt(application);
  if (appliedAt) {
    return {
      label: 'Applied on',
      value: formatApplicationDateTime(appliedAt),
      raw: appliedAt,
      isSubmitted: true,
    };
  }

  const startedAt = getApplicationStartedAt(application);
  if (startedAt) {
    return {
      label: 'Started on',
      value: formatApplicationDateTime(startedAt),
      raw: startedAt,
      isSubmitted: false,
    };
  }

  return { label: 'Applied on', value: null, raw: null, isSubmitted: false };
}
