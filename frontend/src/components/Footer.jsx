import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Deep Dark Editorial Footer
 * Deep dark theme (#1e1e1e), 60% opacity off-white text (#f6f6f6),
 * thin 5% opacity white top border, and 4-column layout with Lucide-style line icons.
 */
export default function Footer() {
  return (
    <footer id="contact" className="swiss-footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Column 1: Brand Summary */}
          <div className="footer-col footer-col-brand">
            <span className="footer-meta-tag">SYSTEM 07 // RESIDENCE</span>
            <h4 className="footer-brand-title">HOSTEL MANAGEMENT SYSTEM</h4>
            <p className="footer-brand-summary">
              A luxury-brutalist residential operating system engineered for spatial discipline,
              verifiable cryptographic accountability, and autonomous collective living.
            </p>
            <div className="footer-badge-pill">EDITION VII • 2026 ARCHIVE</div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="footer-col">
            <h5 className="footer-heading">NAVIGATION</h5>
            <ul className="footer-list">
              <li>
                <NavLink to="/" className="footer-link">
                  Spatial Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/leave" className="footer-link">
                  Leave & Outpasses
                </NavLink>
              </li>
              <li>
                <NavLink to="/visitors" className="footer-link">
                  Visitor Gate Pass
                </NavLink>
              </li>
              <li>
                <NavLink to="/fees" className="footer-link">
                  Fee Ledger & Receipts
                </NavLink>
              </li>
              <li>
                <NavLink to="/complaints" className="footer-link">
                  Maintenance Dispatch
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Column 3: Institutional Links */}
          <div className="footer-col">
            <h5 className="footer-heading">GOVERNANCE</h5>
            <ul className="footer-list">
              <li>
                <NavLink to="/audit" className="footer-link">
                  Tamper-Evident Audit
                </NavLink>
              </li>
              <li>
                <NavLink to="/reports" className="footer-link">
                  Administrative Reports
                </NavLink>
              </li>
              <li>
                <NavLink to="/inventory" className="footer-link">
                  Wing Inventory Index
                </NavLink>
              </li>
              <li>
                <span className="footer-link-static">Residential Charter</span>
              </li>
              <li>
                <span className="footer-link-static">Security Standards</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Details with Lucide-style Line Icons */}
          <div className="footer-col">
            <h5 className="footer-heading">COMMUNICATIONS</h5>
            <ul className="footer-contact-list">
              <li className="footer-contact-item">
                <svg
                  className="footer-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Central Campus Sector 7, Wing A & B</span>
              </li>
              <li className="footer-contact-item">
                <svg
                  className="footer-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>warden.desk@hostel.institution.edu</span>
              </li>
              <li className="footer-contact-item">
                <svg
                  className="footer-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>+91 (080) 2672-1000</span>
              </li>
              <li className="footer-contact-item">
                <svg
                  className="footer-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Gate Control: 06:00 – 22:30 IST</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span>© 2026 HOSTEL MANAGEMENT SYSTEM. ALL RIGHTS RESERVED.</span>
          </div>
          <div className="footer-bottom-right">
            <span className="footer-security-pill">SHA-256 AUDIT COMPLIANT</span>
            <span>SWISS EDITORIAL MINIMALIST SYSTEM</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
