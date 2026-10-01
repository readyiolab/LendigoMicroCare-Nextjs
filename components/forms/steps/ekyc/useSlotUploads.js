import { useState, useEffect, useRef, useCallback } from 'react';
import { uploadToS3, UPLOAD_CATEGORIES, UPLOAD_MAX_BYTES, UploadAbortedError } from '@/lib/services/cloudinaryUpload';
import {
  SLOT_KEYS,
  REQUIRED_SLOTS,
  EMPTY_SLOT,
  createEmptySlots,
  revokePreview,
} from './slotHelpers';

export function useSlotUploads({ isAdminMode, targetUserId, setError }) {
  const [slots, setSlots] = useState(createEmptySlots);

  const abortRefs = useRef({});
  const generationRefs = useRef({ aadhaarFront: 0, aadhaarBack: 0, panFile: 0, otherFile: 0 });
  const promiseRefs = useRef({});
  const slotsRef = useRef(slots);

  const patchSlot = useCallback((field, patch) => {
    setSlots((prev) => {
      const nextSlot = { ...prev[field], ...(typeof patch === 'function' ? patch(prev[field]) : patch) };
      const next = { ...prev, [field]: nextSlot };
      slotsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => () => {
    SLOT_KEYS.forEach((key) => abortRefs.current[key]?.abort());
    setSlots((prev) => {
      SLOT_KEYS.forEach((key) => revokePreview(prev[key]));
      return prev;
    });
  }, []);

  const maxDocMb = Math.round(UPLOAD_MAX_BYTES['residence-proofs'] / (1024 * 1024));

  const startSlotUpload = useCallback(async (field, file, generation) => {
    const controller = new AbortController();
    abortRefs.current[field] = controller;

    const task = (async () => {
      try {
        patchSlot(field, { status: 'optimizing', progress: 0, error: '' });
        const result = await uploadToS3(file, {
          category: UPLOAD_CATEGORIES.residenceProof,
          compress: true,
          compressionOptions: { maxSizeMB: 2, maxWidthOrHeight: 1920 },
          signal: controller.signal,
          targetUserId: isAdminMode ? targetUserId : undefined,
          onPhase: (phase) => {
            if (generationRefs.current[field] !== generation) return;
            patchSlot(field, { status: phase === 'optimizing' ? 'optimizing' : 'uploading' });
          },
          onProgress: (percent) => {
            if (generationRefs.current[field] !== generation) return;
            patchSlot(field, { status: 'uploading', progress: percent });
          },
        });

        if (generationRefs.current[field] !== generation) return null;
        patchSlot(field, {
          status: 'uploaded',
          progress: 100,
          error: '',
          result: {
            url: result.url || null,
            publicId: result.publicId || null,
            fileFormat: result.fileFormat || null,
          },
          isNew: true,
        });
        return result;
      } catch (err) {
        if (err instanceof UploadAbortedError || err?.name === 'UploadAbortedError') {
          return null;
        }
        if (generationRefs.current[field] !== generation) return null;
        patchSlot(field, {
          status: 'error',
          progress: 0,
          error: err.message || 'Upload failed',
          result: null,
          isNew: false,
        });
        throw err;
      }
    })();

    promiseRefs.current[field] = task;
    return task;
  }, [isAdminMode, patchSlot, targetUserId]);

  const handleFileChange = useCallback((field, file) => {
    if (!file) return;
    if (file.size > UPLOAD_MAX_BYTES['residence-proofs']) {
      setError(`File must be under ${maxDocMb} MB. Try compressing the PDF or use a photo (JPG/PNG).`);
      return;
    }

    setError('');
    abortRefs.current[field]?.abort();
    const generation = (generationRefs.current[field] || 0) + 1;
    generationRefs.current[field] = generation;

    setSlots((prev) => {
      revokePreview(prev[field]);
      const isPdf = file.type === 'application/pdf';
      return {
        ...prev,
        [field]: {
          ...EMPTY_SLOT,
          file,
          preview: isPdf ? 'pdf' : URL.createObjectURL(file),
          previewKind: isPdf ? 'pdf' : 'blob',
          status: 'uploading',
          progress: 0,
        },
      };
    });

    startSlotUpload(field, file, generation).catch(() => {});
  }, [maxDocMb, setError, startSlotUpload]);

  const handleRemove = useCallback((field) => {
    abortRefs.current[field]?.abort();
    generationRefs.current[field] = (generationRefs.current[field] || 0) + 1;
    promiseRefs.current[field] = null;
    setSlots((prev) => {
      revokePreview(prev[field]);
      return { ...prev, [field]: { ...EMPTY_SLOT } };
    });
  }, []);

  const handleRetry = useCallback((field) => {
    const file = slots[field]?.file;
    if (!file) return;
    abortRefs.current[field]?.abort();
    const generation = (generationRefs.current[field] || 0) + 1;
    generationRefs.current[field] = generation;
    patchSlot(field, { status: 'uploading', progress: 0, error: '' });
    startSlotUpload(field, file, generation).catch(() => {});
  }, [patchSlot, slots, startSlotUpload]);

  const waitForPendingUploads = async () => {
    const pending = SLOT_KEYS
      .map((key) => promiseRefs.current[key])
      .filter(Boolean);
    if (pending.length === 0) return;
    await Promise.allSettled(pending);
  };

  const uploadingCount = SLOT_KEYS.filter((key) => ['optimizing', 'uploading'].includes(slots[key].status)).length;
  const requiredReady = REQUIRED_SLOTS.every((key) => slots[key].status === 'uploaded');
  const hasUploadError = SLOT_KEYS.some((key) => slots[key].status === 'error');

  return {
    slots,
    setSlots,
    slotsRef,
    maxDocMb,
    handleFileChange,
    handleRemove,
    handleRetry,
    waitForPendingUploads,
    uploadingCount,
    requiredReady,
    hasUploadError,
  };
}
