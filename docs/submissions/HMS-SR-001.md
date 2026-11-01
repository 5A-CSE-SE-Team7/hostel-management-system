Title: fix(HMS-SR-001): enforce production HTTPS and verify TLS handshakes
Head: feature/HMS-SR-001-https-tls
Base: main
Refs #20

Enforces HTTPS for production health/API traffic, disables implicit proxy trust, defaults API binding to loopback and validates paired TLS key/certificate configuration. Preserves HSTS, Secure cookies and minimum TLS 1.2. Documents the explicit trusted-proxy deployment contract.

PASS: two real child-server tests: HTTP and spoofed protocol rejected, TLS 1.2/1.3 accepted with certificate verification, TLS 1.0/1.1 refused with protocol-version alerts, HSTS checked. Deployment/public-domain checks are NOT RUN; no production claim. Evidence: docs/verification/HMS-SR-001.md. Keep draft pending review and combined integration. Reviewer: aadi-basal-06.
