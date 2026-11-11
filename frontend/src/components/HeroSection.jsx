import React from 'react';
import EchoText from './EchoText';

/**
 * High-Impact Typographic Hero Section
 * Full-width section (70vh - 100vh) featuring pure typographic weight,
 * 11vw / 180px massive display text and the 5-layer Echo Stack.
 */
export default function HeroSection({
  headline = 'RESIDENCE',
  subline = 'SYSTEM 07 // INSTITUTIONAL LIVING ARCHITECTURE',
  tagline = 'EST. 2026 • RIGOROUS SWISS FUNCTIONALISM',
}) {
  return (
    <section className="hero-section" aria-label="Hero presentation">
      <div className="hero-meta-top">
        <span className="hero-label">{tagline}</span>
        <span className="hero-divider-dot">•</span>
        <span className="hero-label">EDITION VII</span>
      </div>

      <div className="hero-echo-container">
        <EchoText text={headline} as="h1" className="hero-display-title" />
      </div>

      <div className="hero-meta-bottom">
        <div className="hero-hairline"></div>
        <p className="hero-subline">{subline}</p>
      </div>
    </section>
  );
}
