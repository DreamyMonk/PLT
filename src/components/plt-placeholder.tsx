export function PltPlaceholder() {
    return (
      <svg
        width="80%"
        height="80%"
        viewBox="0 0 800 600"
        className="stroke-current text-muted-foreground/30"
        strokeWidth="1"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <path
          d="M 100 100 H 700 V 500 H 100 Z"
          strokeWidth="2"
          className="stroke-current text-muted-foreground/50"
        />
        <circle cx="250" cy="250" r="80" strokeDasharray="5,5" />
        <rect x="450" y="200" width="200" height="150" />
        <path d="M 100 500 L 250 400" />
        <path d="M 450 350 L 330 250" />
        <text
          x="400"
          y="310"
          fontFamily="sans-serif"
          fontSize="24"
          textAnchor="middle"
          className="fill-current text-muted-foreground/50"
        >
          PLT Viewer
        </text>
      </svg>
    );
  }
  