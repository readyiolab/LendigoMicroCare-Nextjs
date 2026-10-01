/**
 * DigiLocker / Aadhaar address is often stored as JSON
 * ({ house, street, landmark, loc, vtc, dist, state, pc, ... }).
 * Render a single readable line for staff UI.
 */
export function formatKycAddress(raw) {
  if (raw == null || raw === '') return '';

  let obj = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        obj = JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return String(raw);
  }

  const house = String(obj.house || '').trim();
  const parts = [
    house,
    obj.street,
    obj.landmark,
    obj.loc,
    obj.vtc,
    obj.po,
    obj.subdist,
    obj.dist || obj.district_or_city || obj.city,
    obj.state,
    obj.pc || obj.pincode,
    obj.country,
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  const deduped = [];
  for (const part of parts) {
    const last = deduped[deduped.length - 1];
    if (!last || last.toLowerCase() !== part.toLowerCase()) {
      deduped.push(part);
    }
  }

  if (deduped.length) return deduped.join(', ');
  return String(obj.address || obj.fullAddress || '').trim();
}
