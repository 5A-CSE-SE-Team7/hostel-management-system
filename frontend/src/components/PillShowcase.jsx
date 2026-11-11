import React from 'react';

/**
 * Pill-Shaped Vertical Showcase
 * High-aspect-ratio container with height 500px, 9999px border-radius,
 * overflow hidden, 700ms cubic-bezier 1.05x image scale, 20% to 0% grayscale,
 * and a centered circular overlay revealed on hover.
 */
export default function PillShowcase({
  imageSrc,
  imageAlt = 'Architectural living space showcase',
  title = 'WING A // DORMITORY',
  badgeText = 'DISCIPLINE',
  className = '',
}) {
  // Geometric SVG architectural pattern as reliable default visual
  const defaultVisual = (
    <svg
      className="pill-showcase-visual"
      viewBox="0 0 300 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={imageAlt}
    >
      <rect width="300" height="600" fill="#222222" />
      <circle cx="150" cy="300" r="140" fill="none" stroke="#444444" strokeWidth="1" />
      <circle cx="150" cy="300" r="90" fill="none" stroke="#555555" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="150" y1="0" x2="150" y2="600" stroke="#333333" strokeWidth="1" />
      <line x1="0" y1="300" x2="300" y2="300" stroke="#333333" strokeWidth="1" />
      <path d="M50 150 L250 450 M250 150 L50 450" stroke="#383838" strokeWidth="1" />
      <rect x="75" y="200" width="150" height="200" fill="none" stroke="#666666" strokeWidth="1" />
      <text x="150" y="550" fill="#888888" fontSize="12" fontFamily="monospace" textAnchor="middle" letterSpacing="3">
        SEC-07 // ELEVATION
      </text>
    </svg>
  );

  return (
    <div className={`pill-showcase ${className}`.trim()}>
      <div className="pill-image-wrapper">
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt} className="pill-showcase-img" />
        ) : (
          defaultVisual
        )}
      </div>

      {/* Center circular overlay only visible on parent hover */}
      <div className="pill-circle-overlay" aria-hidden="true">
        <div className="pill-overlay-inner">
          <span className="pill-overlay-badge">{badgeText}</span>
          <span className="pill-overlay-title">{title}</span>
        </div>
      </div>
    </div>
  );
}
