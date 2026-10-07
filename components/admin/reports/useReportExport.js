import { useEffect, useRef, useState } from 'react';
import { adminAPI } from '@/lib/api';

export function useReportExport(reportType, filters) {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const reportId = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const start = async () => {
    setStatus('processing');
    setMessage('Preparing your file…');
    try {
      const response = await adminAPI.createReportExport({ reportType, ...(filters || {}) });
      if (response?.status !== 1) {
        setStatus('failed');
        setMessage(response?.message || 'Could not start the download');
        return;
      }
      reportId.current = response.data?.reportId;
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(async () => {
        try {
          const statusRes = await adminAPI.getReportExport(reportId.current);
          const next = statusRes?.data?.status;
          if (next === 'ready') {
            clearInterval(timer.current);
            setStatus('ready');
            setMessage('Your file is ready.');
          } else if (next === 'failed') {
            clearInterval(timer.current);
            setStatus('failed');
            setMessage(statusRes?.data?.error || 'Could not prepare the file');
          }
        } catch (err) {
          clearInterval(timer.current);
          setStatus('failed');
          setMessage(err?.message || 'Could not prepare the file');
        }
      }, 2000);
    } catch (err) {
      setStatus('failed');
      setMessage(err?.message || 'Could not start the download');
    }
  };

  const download = async () => {
    if (!reportId.current) return;
    const response = await adminAPI.downloadReportExport(reportId.current);
    const blob = response?.data;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cases.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return { status, message, start, download };
}
