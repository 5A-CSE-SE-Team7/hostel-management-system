import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Bespoke Service Cards
 * 3-column grid with #1e1e1e/10 borders, hover transition to #ffffff,
 * 64x64px geometric icon containers rotating 12 degrees on hover,
 * and arrow-right CTAs with tracking-wide bold Satoshi typography.
 */
export default function ServiceCards() {
  const services = [
    {
      id: 'allocation',
      code: 'SRV-01',
      title: 'SPATIAL ALLOCATION',
      description:
        'Deterministic bed assignment, room inventory telemetry, and real-time occupancy distribution across hostel wings.',
      cta: 'EXPLORE INVENTORY',
      link: '/inventory',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="10" height="10" stroke="#111111" strokeWidth="1.5" />
          <rect x="15" y="3" width="10" height="10" stroke="#111111" strokeWidth="1.5" />
          <rect x="3" y="15" width="10" height="10" stroke="#111111" strokeWidth="1.5" />
          <rect x="15" y="15" width="10" height="10" fill="#111111" />
        </svg>
      ),
    },
    {
      id: 'clearance',
      code: 'SRV-02',
      title: 'OUTPASS DISPATCH',
      description:
        'Direct gate clearance protocols, scheduled outpasses, visitor verification, and structured warden resolution pipelines.',
      cta: 'REQUEST PASS',
      link: '/leave',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="11" stroke="#111111" strokeWidth="1.5" />
          <line x1="14" y1="3" x2="14" y2="25" stroke="#111111" strokeWidth="1.5" />
          <line x1="3" y1="14" x2="25" y2="14" stroke="#111111" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      ),
    },
    {
      id: 'ledger',
      code: 'SRV-03',
      title: 'CRYPTOGRAPHIC LEDGER',
      description:
        'Immutable double-entry assessments, verified payment receipts, and tamper-evident SHA-256 audit chaining.',
      cta: 'INSPECT LEDGER',
      link: '/fees',
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="#111111" strokeWidth="1.5" fill="none" />
          <circle cx="14" cy="14" r="4" fill="#111111" />
        </svg>
      ),
    },
  ];

  return (
    <section className="services-section" aria-label="Bespoke services">
      <div className="services-header">
        <span className="services-pretitle">CORE CAPABILITIES // PROTOCOLS</span>
        <h2 className="services-title">BESPOKE RESIDENTIAL SERVICES</h2>
      </div>

      <div className="services-grid">
        {services.map((service) => (
          <div key={service.id} className="service-card">
            <div className="service-card-top">
              <span className="service-code">{service.code}</span>
              <div className="geometric-icon-box" aria-hidden="true">
                {service.icon}
              </div>
            </div>

            <div className="service-card-body">
              <h3 className="service-card-title">{service.title}</h3>
              <p className="service-card-desc">{service.description}</p>
            </div>

            <div className="service-card-footer">
              <NavLink to={service.link} className="service-cta-link">
                <span>{service.cta}</span>
                <span className="cta-arrow" aria-hidden="true">
                  →
                </span>
              </NavLink>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
