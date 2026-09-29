import type { CSSProperties } from 'react';
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
      </>
    ),
    path: (
      <>
        <rect x="3" y="3" width="6" height="6" rx="1.5" />
        <rect x="15" y="15" width="6" height="6" rx="1.5" />
        <path d="M15 6h3a3 3 0 0 1 0 6H6a3 3 0 0 0 0 6h3" />
      </>
    ),
    note: (
      <>
        <path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M8 16l1-4L18 3l3 3-9 9-4 1Z" />
      </>
    ),
    history: (
      <>
        <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2" />
      </>
    ),
    progress: (
      <>
        <path d="M4 20V10m8 10V4m8 16v-7M2 21h20" />
      </>
    ),
    book: (
      <>
        <path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="8" cy="7" r="3" />
        <circle cx="16" cy="17" r="3" />
      </>
    ),
    sidebar: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16m6-11-3 3 3 3" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    diagonal: <path d="M6 18 18 6M6 6h12v12" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    moon: <path d="M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z" />,
    system: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-4v4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    flame: <path d="M12 3c1 5 6 5 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 4 3 4 3-5Z" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    spark: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.book}
    </svg>
  );
}
export function Illustration({ kind = 'steps' }: { kind?: string }) {
  return (
    <svg
      className="illustration"
      viewBox="0 0 260 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      {kind === 'globe' ? (
        <>
          <ellipse cx="145" cy="139" rx="100" ry="96" />
          <ellipse cx="145" cy="139" rx="57" ry="96" />
          <path d="M145 43v192M48 112h195M47 155h196" />
          <ellipse cx="145" cy="139" rx="100" ry="40" />
          <path d="m32 34 18-4-4 18M50 30 25 55" />
        </>
      ) : kind === 'candles' ? (
        <>
          {[40, 80, 120, 160, 200].map((x, i) => (
            <g key={x}>
              <path d={`M${x} ${[90, 65, 85, 32, 10][i]}v${[80, 85, 75, 110, 80][i]}`} />
              <rect
                x={x - 10}
                y={[105, 85, 100, 57, 30][i]}
                width="20"
                height={[40, 40, 30, 60, 40][i]}
                rx="1"
                fill={i % 2 === 0 ? 'currentColor' : 'none'}
              />
            </g>
          ))}
          <path d="M20 170h220" />
        </>
      ) : kind === 'shield' ? (
        <>
          <path d="m130 23 64 27v45c0 42-64 75-64 75S66 137 66 95V50Z" />
          <path d="m102 94 20 20 38-44" />
          <circle cx="130" cy="94" r="80" strokeDasharray="2 9" />
        </>
      ) : kind === 'waves' ? (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M20 ${70 + i * 18}C70 ${10 + i * 18} 130 ${160 + i * 10} 240 ${25 + i * 20}`}
            />
          ))}
        </>
      ) : (
        <>
          <path d="M30 171V141h39v-32h39V77h39V45h39V13h40v158H30Z" />
          <path d="m30 141 28 16h39v-32h39V93h39V61h39V29l-28-16M69 109l28 16m11-48 28 16m11-48 28 16m11-48 28 16M58 157v23M97 125v55m39-87v87m39-119v119m39-151v151" />
          <circle cx="45" cy="44" r="17" />
          <path d="m38 46 7-7 7 7m-7-7v13" />
        </>
      )}
    </svg>
  );
}
