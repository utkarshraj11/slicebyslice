export const SliceIcon = ({ fill }: { fill: boolean }) => (
  <svg viewBox="0 0 24 24">
    <path d="M4 5.5 Q12 2 20 5.5 L12 22 Z" fill={fill ? '#f6c453' : '#f3ece0'} stroke="#2e2b29" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M3.6 5.6 Q12 1.6 20.4 5.6" fill="none" stroke={fill ? '#c9813c' : '#d8ccbb'} strokeWidth="2.6" strokeLinecap="round" />
    {fill && <>
      <circle cx="10.5" cy="9" r="1.5" fill="#d9473a" />
      <circle cx="14" cy="12" r="1.3" fill="#d9473a" />
      <circle cx="11.6" cy="15.5" r="1.1" fill="#d9473a" />
    </>}
  </svg>
);

export const CameraIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z" /><circle cx="12" cy="13.2" r="3.4" />
  </svg>
);

export const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M8 15s5-4.6 5-8.6A5 5 0 0 0 3 6.4C3 10.4 8 15 8 15z" /><circle cx="8" cy="6.5" r="1.8" />
  </svg>
);

export const FrameIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" /></svg>
);
export const ListIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3.5h12M2 8h12M2 12.5h12" /></svg>
);
