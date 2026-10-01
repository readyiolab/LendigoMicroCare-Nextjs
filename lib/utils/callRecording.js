const AUDIO_EXT_MIME = {
  mp3: 'audio/mpeg',
  mp2: 'audio/mpeg',
  mpga: 'audio/mpeg',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  wave: 'audio/wav',
  amr: 'audio/amr',
  '3gp': 'audio/3gpp',
  '3gpp': 'audio/3gpp',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  wma: 'audio/x-ms-wma',
  aiff: 'audio/aiff',
  aif: 'audio/aiff',
  caf: 'audio/x-caf',
  webm: 'audio/webm',
  weba: 'audio/webm',
  au: 'audio/basic',
  snd: 'audio/basic',
  mid: 'audio/midi',
  midi: 'audio/midi',
  gsm: 'audio/gsm',
  mp4: 'audio/mp4',
};

const AUDIO_EXT_LIST = Object.keys(AUDIO_EXT_MIME);

export const CALL_RECORDING_ACCEPT = [
  'audio/*',
  'video/3gpp',
  'video/3gpp2',
  'application/ogg',
  ...AUDIO_EXT_LIST.map((ext) => `.${ext}`),
].join(',');

export function extensionFromName(value) {
  const match = String(value || '').toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
  return match ? match[1] : '';
}

export function resolveAudioMime(fileName, mimeType) {
  const mime = String(mimeType || '').toLowerCase().trim();
  if (mime.startsWith('audio/') && mime !== 'audio/unknown') return mime;
  const ext = extensionFromName(fileName);
  if (ext && AUDIO_EXT_MIME[ext]) return AUDIO_EXT_MIME[ext];
  if (mime === 'application/ogg') return 'audio/ogg';
  if (mime === 'video/3gpp' || mime === 'video/3gpp2') return mime;
  return mime || '';
}

export function isAllowedRecordingFile(file) {
  if (!file) return false;
  const name = file.name || '';
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('audio/')) return true;
  if (['video/3gpp', 'video/3gpp2', 'video/mp4', 'application/ogg'].includes(type)) return true;
  const ext = extensionFromName(name);
  if (AUDIO_EXT_MIME[ext]) return true;
  if (type === 'application/octet-stream' && AUDIO_EXT_MIME[ext]) return true;
  return false;
}

export function normalizeRecordingFile(file) {
  if (!file) return file;
  const mime = resolveAudioMime(file.name, file.type);
  if (!mime || mime === file.type) return file;
  return new File([file], file.name, { type: mime, lastModified: file.lastModified });
}

export function recordingMimeFromUrl(url) {
  return resolveAudioMime(url, '') || undefined;
}
