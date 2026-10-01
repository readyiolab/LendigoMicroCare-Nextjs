export const SLOT_KEYS = ['aadhaarFront', 'aadhaarBack', 'panFile', 'otherFile'];
export const REQUIRED_SLOTS = ['aadhaarFront', 'aadhaarBack', 'panFile'];
export const SLOT_TYPES = {
  aadhaarFront: 'aadhaar_front',
  aadhaarBack: 'aadhaar_back',
  panFile: 'pan_front',
};
export const EMPTY_SLOT = {
  file: null,
  preview: null,
  previewKind: null,
  status: 'idle',
  progress: 0,
  error: '',
  result: null,
  isNew: false,
  existing: null,
};

export const createEmptySlots = () => ({
  aadhaarFront: { ...EMPTY_SLOT },
  aadhaarBack: { ...EMPTY_SLOT },
  panFile: { ...EMPTY_SLOT },
  otherFile: { ...EMPTY_SLOT },
});

export const revokePreview = (slot) => {
  if (slot?.previewKind === 'blob' && slot.preview) {
    URL.revokeObjectURL(slot.preview);
  }
};
