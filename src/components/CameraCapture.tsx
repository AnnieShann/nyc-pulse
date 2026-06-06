import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Camera, RotateCcw, X } from 'lucide-react';

// Live camera capture. Uses getUserMedia (NOT a file input) so the photo is
// provably taken right now — it cannot be selected from the photo library.
export default function CameraCapture({
  spotName,
  onCapture,
  onClose,
}: {
  spotName: string;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError('Camera unavailable. Allow camera access to drop a photo.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const max = 720;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    setShot(canvas.toDataURL('image/jpeg', 0.55));
  };

  const use = () => {
    if (!shot) return;
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCapture(shot);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(7,8,12,0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: '14px 16px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Drop a photo · live
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--fg-1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {spotName}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="grid place-items-center"
          style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ink-700)', border: 'none', color: 'var(--fg-1)' }}
        >
          <X size={20} strokeWidth={2.2} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          margin: '0 16px',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: '#000',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
        }}
      >
        {error ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-2)', fontSize: 15 }}>{error}</div>
        ) : shot ? (
          <img src={shot} alt="captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      <div className="flex items-center justify-center" style={{ gap: 16, padding: '20px 16px 28px' }}>
        {error ? (
          <button type="button" onClick={onClose} className="press" style={ctaStyle}>
            Close
          </button>
        ) : shot ? (
          <>
            <button
              type="button"
              onClick={() => setShot(null)}
              className="press"
              style={secondaryStyle}
            >
              <RotateCcw size={16} /> Retake
            </button>
            <button type="button" onClick={use} className="press" style={ctaStyle}>
              Use photo
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={capture}
            aria-label="Capture photo"
            className="press"
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              background: 'var(--pulse)',
              border: '4px solid rgba(255,255,255,0.85)',
              boxShadow: 'var(--glow-pulse-lg)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--fg-on-accent)',
              cursor: 'pointer',
            }}
          >
            <Camera size={26} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  );
}

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 50,
  padding: '0 28px',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--pulse)',
  color: 'var(--fg-on-accent)',
  fontSize: 16,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  boxShadow: 'var(--glow-pulse)',
};
const secondaryStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 50,
  padding: '0 22px',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--ink-700)',
  color: 'var(--fg-1)',
  fontSize: 16,
  fontWeight: 600,
  border: '1px solid var(--line-2)',
  cursor: 'pointer',
};
