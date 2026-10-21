export async function loadBureauReport({ fetchDetail, fetchSummary, force = false }) {
  const detail = await fetchDetail({ force });
  if (detail) return detail;
  return fetchSummary({ force });
}
