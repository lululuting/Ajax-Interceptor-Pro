import React from 'react';

function IconBase({ className = '', children, viewBox = '0 0 24 24' }) {
  return (
    <svg className={`ui-icon ${className}`.trim()} viewBox={viewBox} aria-hidden="true">
      {children}
    </svg>
  );
}

export function LogoIcon() {
  return (
    <IconBase className="ui-icon-logo" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="logoMissile" x1="0" y1="18" x2="0" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7FFFD" />
          <stop offset="1" stopColor="#BFF7E9" />
        </linearGradient>
        <linearGradient id="logoFlare" x1="64" y1="82" x2="64" y2="104" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE082" />
          <stop offset="1" stopColor="#FF8A3D" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="44" stroke="#D9FFF8" strokeOpacity="0.2" strokeWidth="6" />
      <circle cx="64" cy="64" r="31" stroke="#D9FFF8" strokeOpacity="0.32" strokeWidth="5" />
      <path d="M64 14V28" stroke="#E8FFFB" strokeOpacity="0.42" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M64 100V114" stroke="#E8FFFB" strokeOpacity="0.42" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M14 64H28" stroke="#E8FFFB" strokeOpacity="0.42" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M100 64H114" stroke="#E8FFFB" strokeOpacity="0.42" strokeWidth="4.5" strokeLinecap="round" />
      <g transform="rotate(45 64 64)">
        <path d="M64 4L73 24H55L64 4Z" fill="url(#logoMissile)" />
        <path d="M57 19H71L76 28V78L64 88L52 78V28L57 19Z" fill="url(#logoMissile)" />
        <path d="M52 56L33 78H48L58 63L52 56Z" fill="#C8FFF3" />
        <path d="M76 56L95 78H80L70 63L76 56Z" fill="#C8FFF3" />
        <path d="M60 26H68L69 70H59L60 26Z" fill="#139A8B" fillOpacity="0.32" />
        <path d="M58 82H70L77 99H51L58 82Z" fill="#E9FFFA" />
        <path d="M64 88L68 113H60L64 88Z" fill="url(#logoFlare)" />
      </g>
      <circle cx="95" cy="33" r="6" fill="#D8FFF8" fillOpacity="0.98" />
      <path d="M95 22V28" stroke="#D8FFF8" strokeWidth="3" strokeLinecap="round" />
      <path d="M95 38V44" stroke="#D8FFF8" strokeWidth="3" strokeLinecap="round" />
      <path d="M84 33H90" stroke="#D8FFF8" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 33H106" stroke="#D8FFF8" strokeWidth="3" strokeLinecap="round" />
    </IconBase>
  );
}

export function FolderIcon() {
  return (
    <IconBase className="ui-icon-folder">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </IconBase>
  );
}

export function FolderOpenIcon() {
  return (
    <IconBase className="ui-icon-folder">
      <path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V8z" />
      <path d="M3 11h18l-2 7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2l-2-7z" />
    </IconBase>
  );
}

export function AddIcon() {
  return (
    <IconBase>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function EditIcon() {
  return (
    <IconBase>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </IconBase>
  );
}

export function DeleteIcon() {
  return (
    <IconBase>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconBase>
  );
}

export function ImportIcon() {
  return (
    <IconBase>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </IconBase>
  );
}

export function ExportIcon() {
  return (
    <IconBase>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </IconBase>
  );
}

export function SettingsIcon() {
  return (
    <IconBase>
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6z" />
    </IconBase>
  );
}

export function SearchIcon() {
  return (
    <IconBase>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function InfoIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </IconBase>
  );
}

export function ListIcon() {
  return (
    <IconBase>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </IconBase>
  );
}

export function CodeIcon() {
  return (
    <IconBase>
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 4-4 16" />
    </IconBase>
  );
}

export function RadarTargetIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="6.8" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 2.5V6" />
      <path d="M12 18V21.5" />
      <path d="M2.5 12H6" />
      <path d="M18 12H21.5" />
    </IconBase>
  );
}

export function FileIcon() {
  return (
    <IconBase className="ui-icon-file">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
    </IconBase>
  );
}
