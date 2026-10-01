import { useEffect, useRef, useState } from 'react';
import { utilityAPI } from '@/lib/api';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const DEBOUNCE_MS = 400;
const IDLE = { loading: false, bank: '', branch: '', error: '', invalid: false };

/**
 * Debounced IFSC → bank/branch lookup for staff bank edits.
 * `invalid` is only set when the lookup service says the IFSC does not exist (HTTP 400);
 * outages set `error` instead so staff are not blocked from saving.
 */
export default function useIfscLookup(ifsc, { enabled = true } = {}) {
  const code = String(ifsc || '').trim().toUpperCase();
  const active = enabled && IFSC_RE.test(code);
  const [state, setState] = useState(IDLE);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!active) {
      setState(IDLE);
      return undefined;
    }
    setState({ ...IDLE, loading: true });
    const timer = setTimeout(async () => {
      try {
        const response = await utilityAPI.validateIFSC(code);
        if (requestId !== requestRef.current) return;
        const data = response?.data || {};
        if (response?.status === 1 && data.bank) {
          setState({ ...IDLE, bank: data.bank, branch: data.branch || '' });
        } else {
          setState({ ...IDLE, error: 'Bank lookup unavailable' });
        }
      } catch (err) {
        if (requestId !== requestRef.current) return;
        if (err?.status === 400) {
          setState({ ...IDLE, invalid: true, error: 'IFSC not found — check the code' });
        } else {
          setState({ ...IDLE, error: 'Bank lookup unavailable' });
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code, active]);

  return state;
}
