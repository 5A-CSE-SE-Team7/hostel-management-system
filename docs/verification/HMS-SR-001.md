# HMS-SR-001 — HTTPS and TLS verification

Aayaan Kamil / PES2UG24CS017. Verified issue #20. Independent base: main 3fc386a. No M1/M2 implementation changed.

Production always enforces HTTPS (including health). A direct HTTP request cannot bypass the guard by supplying X-Forwarded-Proto: trust proxy is disabled unless TRUST_PROXY explicitly names the intended proxy range. API binding defaults to loopback. For local nginx termination use HOST=127.0.0.1 and TRUST_PROXY=loopback; restrict direct API access with host/network controls. For remote proxies use their exact trusted addresses/CIDRs, never a broad unconditional trust setting. The optional direct Node HTTPS listener retains minimum TLS 1.2. Partial key/certificate configuration fails clearly. Existing HSTS and Secure session-cookie settings are preserved.

Run `node --test backend/tests/tls.test.js` with backend dependencies installed. Actual PASS on Node 24: two tests launching real child API servers; plain HTTP health and spoofed HTTPS header each returned 426, trusted temporary certificate verified TLS 1.2 and 1.3 handshakes, OpenSSL TLS 1.0/1.1 each received an explicit protocol-version alert, and HTTPS returned HSTS. The generated key/certificate are ephemeral /tmp test fixtures, removed after tests. Certificate verification was not disabled.

For deployment supply a real certificate through TLS_KEY_PATH/TLS_CERT_PATH or install the referenced nginx certificate paths, build frontend assets, set a strong SESSION_SECRET securely, and configure the actual domain. Nginx reference already permits TLSv1.2/TLSv1.3 only. Test the actual deployed domain using OpenSSL/testssl before claiming production acceptance. Nginx deployment and public-domain validation are NOT RUN; no production HTTPS claim is made. Self-signed local test evidence is protocol evidence only.

Main-based frontend and baseline unit-suite integration remain pending S03/M1/M2. S04 patched dependency changes are a separate review prerequisite; these TLS tests ran against the already installed patched backend dependencies. No audit findings were suppressed.
