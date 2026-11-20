type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconClose = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconBack = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconSound = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />
  </svg>
);
export const IconMute = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </svg>
);
export const IconChart = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconGear = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base} strokeWidth={1.6}>
    <path d="M19.19 10.24 L21.49 10.57 L21.49 13.43 L19.19 13.76 A7.4 7.4 0 0 1 18.33 15.84 L19.73 17.70 L17.70 19.73 L15.84 18.33 A7.4 7.4 0 0 1 13.76 19.19 L13.43 21.49 L10.57 21.49 L10.24 19.19 A7.4 7.4 0 0 1 8.16 18.33 L6.30 19.73 L4.27 17.70 L5.67 15.84 A7.4 7.4 0 0 1 4.81 13.76 L2.51 13.43 L2.51 10.57 L4.81 10.24 A7.4 7.4 0 0 1 5.67 8.16 L4.27 6.30 L6.30 4.27 L8.16 5.67 A7.4 7.4 0 0 1 10.24 4.81 L10.57 2.51 L13.43 2.51 L13.76 4.81 A7.4 7.4 0 0 1 15.84 5.67 L17.70 4.27 L19.73 6.30 L18.33 8.16 A7.4 7.4 0 0 1 19.19 10.24Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconLock = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
  </svg>
);
export const IconFlame = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M12.6 2.5c.4 3-1.3 4.6-2.8 6.2C8.2 10.4 6.8 12 6.8 14.6A5.3 5.3 0 0012 20a5.3 5.3 0 005.2-5.4c0-2.2-1-3.7-2-4.9-.2 1.4-.9 2.4-1.9 2.9.6-3.4-.1-7.2-.7-10.1z" />
  </svg>
);
export const IconCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base} strokeWidth={2.4}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const IconRotate = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden {...base} strokeWidth={2}>
    <rect x="16" y="6" width="16" height="28" rx="3" />
    <path d="M8 30a16 16 0 0018 12M26 42l-3-3.5M26 42l-4 1.5" />
  </svg>
);
