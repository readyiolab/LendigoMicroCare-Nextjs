import { FileText } from 'lucide-react';
import { getOptimizedUrl } from '@/lib/services/cloudinaryUpload';
import { detectMimeType } from './utils/documentMime';

/**
 * Document preview thumbnail used by disbursement / docs UIs.
 * Extracted from ApplicationContext for reviewability; behavior unchanged.
 */
export default function DocumentThumbnail({ url, icon: IconProp = FileText, fileFormat = null }) {
  if (!url || url.startsWith('blob:')) {
    const Icon = IconProp;
    return <Icon className="w-8 h-8 text-gray-400" />;
  }

  const detectedMime = detectMimeType(url, fileFormat);
  const isImage = detectedMime ? detectedMime.startsWith('image/') : false;

  if (isImage) {
    return (
      <img
        src={getOptimizedUrl(url, { width: 400 })}
        className="w-full h-full object-cover"
        alt="Document"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  }

  const Icon = IconProp;
  return <Icon className="w-8 h-8 text-blue-500" />;
}

/** Stable ApplicationContext API wrapper (same signature as before). */
export function renderDocumentThumbnail(url, icon = FileText, fileFormat = null) {
  return <DocumentThumbnail url={url} icon={icon} fileFormat={fileFormat} />;
}
