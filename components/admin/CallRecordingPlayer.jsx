import { useState } from 'react';

export default function CallRecordingPlayer({ src, className = 'h-8 w-full max-w-sm' }) {
  const [failed, setFailed] = useState(false);
  if (!src) return null;

  return (
    <div className="min-w-0 w-full">
      <audio
        key={src}
        controls
        preload="metadata"
        className={className}
        src={src}
        onError={() => setFailed(true)}
        onLoadedMetadata={() => setFailed(false)}
      />
      {failed ? (
        <p className="text-[10px] text-slate-500 mt-1">
          This format may not play in the browser.{' '}
          <a href={src} download className="underline font-semibold text-slate-700">
            Download the recording
          </a>
        </p>
      ) : null}
    </div>
  );
}
