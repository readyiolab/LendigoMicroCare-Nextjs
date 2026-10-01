const STATUS_VIEWS = {
  draft: {
    id: 'drafts',
    title: 'Drafts',
    subtitle: 'Incomplete applications still in intake',
    filterLabel: 'Draft only',
    emptyMessage: 'No draft applications found.',
  },
  submitted: {
    id: 'fresh',
    title: 'Fresh leads',
    subtitle: 'Submitted applications awaiting first contact',
    filterLabel: 'Submitted only',
    emptyMessage: 'No fresh submitted applications in the queue.',
  },
  under_review: {
    id: 'under_review',
    title: 'Under review',
    subtitle: 'Credit review queue',
    filterLabel: 'Under review',
    emptyMessage: 'No applications are currently under review.',
  },
  recommended: {
    id: 'recommended',
    title: 'Recommended',
    subtitle: 'Ready for sanction decision',
    filterLabel: 'Recommended',
    emptyMessage: 'No recommended applications assigned to you yet. Cases appear here after a Credit Manager recommends them.',
  },
  approved: {
    id: 'approved',
    title: 'Sanctioned',
    subtitle: 'Sanctioned / pre-disbursement',
    filterLabel: 'Sanctioned',
    emptyMessage: 'No sanctioned applications in your queue.',
  },
  offer_sent: {
    id: 'offer_sent',
    title: 'Offer Sent',
    subtitle: 'Offer sent, waiting for customer acceptance',
    filterLabel: 'Offer Sent',
    emptyMessage: 'No applications with an offer sent.',
  },
  video_declaration_submitted: {
    id: 'video_submitted',
    title: 'Video Submitted',
    subtitle: 'Video declaration submitted, awaiting review',
    filterLabel: 'Video Submitted',
    emptyMessage: 'No submitted video declarations to review.',
  },
  esign_pending: {
    id: 'esign_pending',
    title: 'eSign Pending',
    subtitle: 'Waiting for the customer to e-sign the agreement',
    filterLabel: 'eSign Pending',
    emptyMessage: 'No applications waiting for e-sign.',
  },
  emandate: {
    id: 'emandate',
    title: 'eMandate',
    subtitle: 'e-Sign done, e-Mandate registration pending',
    filterLabel: 'eMandate',
    emptyMessage: 'No applications waiting for e-Mandate.',
  },
  failed: {
    id: 'failed',
    title: 'Rejected',
    subtitle: 'Rejected, offer rejected, video rejected or e-Mandate failed',
    filterLabel: 'Rejected',
    emptyMessage: 'No rejected applications found.',
  },
  rejected: {
    id: 'rejected',
    title: 'Rejected process',
    subtitle: 'Rejected or offer rejected',
    filterLabel: 'Rejected',
    emptyMessage: 'No rejected applications found.',
  },
  payment_pending: {
    id: 'payment_pending',
    title: 'Payout review',
    subtitle: 'Payment pending disbursement',
    filterLabel: 'Payment pending',
    emptyMessage: 'No applications awaiting payout.',
  },
};

const BUCKET_VIEWS = {
  fresh: {
    id: 'bucket_fresh',
    title: 'Fresh',
    subtitle: 'Applications in your Fresh credit bucket',
    filterLabel: 'Fresh bucket',
    emptyMessage: 'No applications in your Fresh bucket.',
  },
  repeat: {
    id: 'bucket_repeat',
    title: 'Repeat',
    subtitle: 'Applications in your Repeat credit bucket',
    filterLabel: 'Repeat bucket',
    emptyMessage: 'No applications in your Repeat bucket.',
  },
  sanctional: {
    id: 'bucket_sanctional',
    title: 'Sanctional',
    subtitle: 'Applications in your Sanctional credit bucket',
    filterLabel: 'Sanctional bucket',
    emptyMessage: 'No applications in your Sanctional bucket.',
  },
};

const DEFAULT_VIEW = {
  id: 'all',
  title: 'All Applications',
  subtitle: 'Full portfolio — review and manage loan requests',
  filterLabel: null,
  emptyMessage: 'Wait for new applications to be submitted by users.',
  showCompactSummary: true,
};

const DISBURSAL_VIEWS = {
  latest: {
    id: 'disbursal_latest',
    title: 'Latest Disbursal',
    subtitle: 'Disbursed applications · newest disbursal first',
    filterLabel: 'Latest Disbursal',
    emptyMessage: 'No disbursed applications found.',
  },
};

/**
 * @param {URLSearchParams | { get: (k: string) => string | null }} searchParams
 */
export function resolveApplicationListView(searchParams) {
  const bucket = String(searchParams.get('bucket') || '').toLowerCase();
  const repeat = searchParams.get('repeat');
  const assigned = searchParams.get('assigned');
  const status = searchParams.get('status');
  const disbursal = String(searchParams.get('disbursal') || '').toLowerCase();

  if (disbursal && DISBURSAL_VIEWS[disbursal]) {
    return {
      ...DISBURSAL_VIEWS[disbursal],
      showCompactSummary: true,
      hasActiveFilter: true,
    };
  }

  if (bucket && BUCKET_VIEWS[bucket]) {
    return {
      ...BUCKET_VIEWS[bucket],
      showCompactSummary: true,
      hasActiveFilter: true,
    };
  }

  if (repeat === '1') {
    return {
      id: 'repeat',
      title: 'Repeat customers',
      subtitle: 'Borrowers with prior disbursed or closed loans',
      filterLabel: 'Repeat customers',
      emptyMessage: 'No repeat customer applications found.',
      showCompactSummary: true,
      hasActiveFilter: true,
    };
  }

  if (assigned === 'me') {
    return {
      id: 'assigned',
      title: 'My assigned',
      subtitle: 'Applications assigned to you',
      filterLabel: 'My assigned',
      emptyMessage: 'You have no assigned applications. Recommended cases are auto-assigned when Credit Manager submits them.',
      showCompactSummary: true,
      hasActiveFilter: true,
    };
  }

  if (status && STATUS_VIEWS[status]) {
    return {
      ...STATUS_VIEWS[status],
      showCompactSummary: true,
      hasActiveFilter: true,
    };
  }

  return { ...DEFAULT_VIEW, hasActiveFilter: false };
}

export function hasListFilters(searchParams) {
  const view = resolveApplicationListView(searchParams);
  return view.hasActiveFilter;
}
