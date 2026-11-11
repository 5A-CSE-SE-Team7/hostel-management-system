import React from 'react';

/**
 * Philosophy / Narrative Section
 * Features a vertical hairline divider, oversized Clash Display editorial quote
 * with contrasting serif italic emphasis, and a 3-column architectural grid with 32px gaps.
 */
export default function NarrativeSection() {
  const pillars = [
    {
      index: '01',
      title: 'REDUCTIVE SPATIAL ORDER',
      text: 'Stripped of ornamental excess. Living spaces and physical inventory tracked with mathematical precision and uncompromising geometric purity.',
    },
    {
      index: '02',
      title: 'CRYPTOGRAPHIC DISCIPLINE',
      text: 'Every ledger debit, outpass issuance, and room transfer is chained into an immutable SHA-256 tamper-evident architectural record.',
    },
    {
      index: '03',
      title: 'AUTONOMOUS CONTINUITY',
      text: 'Self-regulating service pipelines. Student requests, warden authorizations, and maintenance dispatches execute with zero administrative drag.',
    },
  ];

  return (
    <section className="narrative-section" aria-label="Design philosophy">
      {/* Vertical hairline divider leading into section */}
      <div className="narrative-hairline" aria-hidden="true" />

      <div className="narrative-container">
        <blockquote className="narrative-quote">
          “Order is not the absence of entropy, but the mastery of{' '}
          <span className="editorial-italic">structure</span>.
          Architecture calibrated for collective living.”
        </blockquote>

        <div className="narrative-grid">
          {pillars.map((pillar) => (
            <div key={pillar.index} className="narrative-col">
              <span className="narrative-col-index">{pillar.index}</span>
              <h3 className="narrative-col-title">{pillar.title}</h3>
              <p className="narrative-col-text">{pillar.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
