import React from 'react';
import PillShowcase from './PillShowcase';

/**
 * Asymmetrical Showcase Grid
 * A 12-column architectural grid featuring mixed aspect ratios:
 * 1. Large 8-column rectangular card with rounded-sm corners
 * 2. Vertical 4-column pill-shaped card (full border-radius)
 * 3. Circular 5-column aspect-square image container
 * 4. Wide 7-column rectangle card
 * All visuals start at 20% grayscale, smoothly revealing full color and 1.05x scale on hover.
 */
export default function ShowcaseGrid() {
  return (
    <section className="showcase-section" aria-label="Architectural showcase">
      <div className="showcase-header">
        <span className="showcase-pretitle">PORTFOLIO // SPATIAL ARCHIVES</span>
        <h2 className="showcase-title">COLLECTIVE LIVING ARTIFACTS</h2>
      </div>

      <div className="asym-grid">
        {/* Item 1: Large 8-column rectangular card with rounded-sm */}
        <div className="asym-item asym-col-8 asym-rect-large">
          <div className="asym-media-wrapper">
            <svg
              className="asym-visual"
              viewBox="0 0 800 480"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Modular living pod assembly"
            >
              <rect width="800" height="480" fill="#181818" />
              <g stroke="#3a3a3a" strokeWidth="1">
                <line x1="0" y1="120" x2="800" y2="120" />
                <line x1="0" y1="240" x2="800" y2="240" />
                <line x1="0" y1="360" x2="800" y2="360" />
                <line x1="200" y1="0" x2="200" y2="480" />
                <line x1="400" y1="0" x2="400" y2="480" />
                <line x1="600" y1="0" x2="600" y2="480" />
              </g>
              <rect x="240" y="80" width="320" height="320" fill="none" stroke="#666666" strokeWidth="1.5" />
              <circle cx="400" cy="240" r="120" fill="none" stroke="#888888" strokeWidth="1" strokeDasharray="6 6" />
              <path d="M240 80 L560 400 M560 80 L240 400" stroke="#444444" strokeWidth="1" />
              <text x="40" y="440" fill="#aaaaaa" fontSize="13" fontFamily="monospace" letterSpacing="2">
                FIG. 01 // MODULAR UNIT ARCHITECTURE — BLOCK NORTH
              </text>
            </svg>
          </div>
          <div className="asym-caption">
            <span className="asym-meta">MODULE A-08</span>
            <span className="asym-name">Monolithic Habitation Quarters</span>
          </div>
        </div>

        {/* Item 2: Vertical 4-column pill-shaped card */}
        <div className="asym-item asym-col-4 asym-pill-slot">
          <PillShowcase
            title="ELEVATION // SOUTH TOWER"
            badgeText="AXIOMATIC"
            imageAlt="Vertical core elevation"
          />
        </div>

        {/* Item 3: Circular 5-column aspect-square image */}
        <div className="asym-item asym-col-5 asym-circle-container">
          <div className="asym-circle-frame">
            <svg
              className="asym-visual"
              viewBox="0 0 500 500"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Atrium structural radial plan"
            >
              <rect width="500" height="500" fill="#141414" />
              <circle cx="250" cy="250" r="230" fill="none" stroke="#333333" strokeWidth="1" />
              <circle cx="250" cy="250" r="170" fill="none" stroke="#4a4a4a" strokeWidth="1" />
              <circle cx="250" cy="250" r="110" fill="none" stroke="#666666" strokeWidth="1" strokeDasharray="5 5" />
              <circle cx="250" cy="250" r="50" fill="none" stroke="#888888" strokeWidth="1" />
              <line x1="250" y1="20" x2="250" y2="480" stroke="#333333" strokeWidth="1" />
              <line x1="20" y1="250" x2="480" y2="250" stroke="#333333" strokeWidth="1" />
              <polygon points="250,80 397,250 250,420 103,250" fill="none" stroke="#555555" strokeWidth="1" />
              <text x="250" y="254" fill="#ffffff" fontSize="11" fontFamily="monospace" textAnchor="middle" letterSpacing="3">
                RADIAL // CORE
              </text>
            </svg>
          </div>
          <div className="asym-caption asym-center-caption">
            <span className="asym-meta">PLAN 05</span>
            <span className="asym-name">Central Atrium Radial Plan</span>
          </div>
        </div>

        {/* Item 4: Wide 7-column rectangle */}
        <div className="asym-item asym-col-7 asym-rect-wide">
          <div className="asym-media-wrapper">
            <svg
              className="asym-visual"
              viewBox="0 0 700 380"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Shared study hall longitudinal section"
            >
              <rect width="700" height="380" fill="#1c1c1c" />
              <g stroke="#353535" strokeWidth="1">
                <line x1="0" y1="95" x2="700" y2="95" />
                <line x1="0" y1="190" x2="700" y2="190" />
                <line x1="0" y1="285" x2="700" y2="285" />
                <line x1="175" y1="0" x2="175" y2="380" />
                <line x1="350" y1="0" x2="350" y2="380" />
                <line x1="525" y1="0" x2="525" y2="380" />
              </g>
              <rect x="120" y="70" width="460" height="240" fill="none" stroke="#555555" strokeWidth="1.5" />
              <circle cx="350" cy="190" r="80" fill="none" stroke="#777777" strokeWidth="1" />
              <text x="350" y="194" fill="#aaaaaa" fontSize="11" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
                LONGITUDINAL // 07-B
              </text>
              <text x="30" y="350" fill="#777777" fontSize="12" fontFamily="monospace" letterSpacing="2">
                COMMUNAL COMMONS // ACOUSTIC BOUNDARY
              </text>
            </svg>
          </div>
          <div className="asym-caption">
            <span className="asym-meta">HORIZON 07</span>
            <span className="asym-name">Communal Study & Social Nexus</span>
          </div>
        </div>
      </div>
    </section>
  );
}
