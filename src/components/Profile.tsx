import { useRef, useState, type CSSProperties } from 'react';
import { Camera, X } from 'lucide-react';
import { fileToResizedDataUrl } from '../lib/image';
import { Wordmark } from './pulse-ui';

export type ProfileValues = { name: string; email: string; bio: string; avatar: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/* Circular avatar that opens a file picker (library or camera) on tap. */
export function AvatarPicker({
  name,
  avatar,
  size = 88,
  onChange,
}: {
  name: string;
  avatar: string;
  size?: number;
  onChange: (dataUrl: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="press"
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid var(--line-2)',
          background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--pulse-dim), var(--status-dead))',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-label="Choose profile photo"
      >
        {avatar ? (
          <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: size * 0.34, fontWeight: 800, color: 'var(--fg-1)' }}>{initials(name)}</span>
        )}
      </button>
      <span
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: 30,
          height: 30,
          borderRadius: 999,
          background: 'var(--pulse)',
          border: '2px solid var(--ink-900)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--fg-on-accent)',
          pointerEvents: 'none',
        }}
      >
        <Camera size={15} strokeWidth={2.2} />
      </span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async e => {
          const f = e.target.files?.[0];
          if (f) onChange(await fileToResizedDataUrl(f, 256, 0.72));
          e.target.value = '';
        }}
      />
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--fg-3)',
  fontWeight: 600,
};
const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--ink-600)',
  border: '1px solid var(--line-1)',
  color: 'var(--fg-1)',
  fontSize: 15,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
};

/* Shared profile fields. */
export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ProfileValues;
  submitLabel: string;
  onSubmit: (v: ProfileValues) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [bio, setBio] = useState(initial.bio);
  const [avatar, setAvatar] = useState(initial.avatar);
  const valid = name.trim().length > 0;

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (valid) onSubmit({ name: name.trim(), email: email.trim(), bio: bio.trim(), avatar });
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <AvatarPicker name={name} avatar={avatar} onChange={setAvatar} />
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>Name</span>
        <input style={inputStyle} value={name} maxLength={24} placeholder="your name" onChange={e => setName(e.target.value)} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>Email</span>
        <input
          style={inputStyle}
          type="email"
          value={email}
          maxLength={120}
          placeholder="you@email.com"
          onChange={e => setEmail(e.target.value)}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>Bio</span>
        <textarea
          className="pulse-input"
          style={{ ...inputStyle, height: 72, padding: '10px 12px', resize: 'none', lineHeight: 1.4 }}
          value={bio}
          maxLength={200}
          placeholder="a line about you (optional)"
          onChange={e => setBio(e.target.value)}
        />
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="press"
            style={{
              flex: 1,
              height: 50,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--ink-700)',
              border: '1px solid var(--line-2)',
              color: 'var(--fg-1)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!valid}
          className="press"
          style={{
            flex: 2,
            height: 50,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--pulse)',
            color: 'var(--fg-on-accent)',
            border: 'none',
            fontSize: 16,
            fontWeight: 700,
            cursor: valid ? 'pointer' : 'not-allowed',
            opacity: valid ? 1 : 0.4,
            boxShadow: valid ? 'var(--glow-pulse)' : 'none',
          }}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/* First-run onboarding (full screen). */
export function Onboarding({
  initial,
  onComplete,
}: {
  initial: ProfileValues;
  onComplete: (v: ProfileValues) => void;
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--ink-900)',
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 20px calc(env(safe-area-inset-bottom) + 24px)',
        overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <Wordmark size={30} />
          <p style={{ margin: 0, fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            Set up your profile to start calling the city's vibe.
          </p>
        </div>
        <ProfileForm initial={initial} submitLabel="Get started" onSubmit={onComplete} />
      </div>
    </div>
  );
}

/* Edit profile later (modal over the map). */
export function ProfileEditModal({
  initial,
  onSave,
  onClose,
}: {
  initial: ProfileValues;
  onSave: (v: ProfileValues) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2600,
        background: 'var(--glass-scrim)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          maxHeight: '90dvh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--glass-surface)',
          border: '1px solid var(--line-2)',
          boxShadow: 'var(--inset-top), var(--shadow-pop)',
          backdropFilter: 'blur(var(--blur-sheet))',
          WebkitBackdropFilter: 'blur(var(--blur-sheet))',
          padding: 18,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)' }}>Edit profile</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center"
            style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--ink-600)', border: 'none', color: 'var(--fg-2)' }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
        <ProfileForm initial={initial} submitLabel="Save" onSubmit={onSave} onCancel={onClose} />
      </div>
    </div>
  );
}
