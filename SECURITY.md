# Security policy

For a plain-language overview of how I harden this site (CSP, integrity checks, demo API allowlist, and privacy notes), see **[security.md](security.md)**.

## Maintainer notes

When upgrading Three.js, update the **`importmap`** JSON in **`index.html`** (same block in **`project-demos.html`** CSP if you add a map there), then recompute the CSP **`sha256-...`** for that exact script text so `script-src` still allows it. **`cdn.jsdelivr.net`** must stay in **`script-src`**.

**`frame-ancestors`** cannot be set in a `<meta>` CSP (browsers ignore it and log an error). To restrict who may embed the site in an iframe, send it as a real **HTTP response header** (for example a Cloudflare **Transform Rule** or **Workers** response header: `Content-Security-Policy: frame-ancestors 'self'`).

## Reporting a vulnerability

If you believe you have found a security vulnerability in this project, please contact me through a **private** channel (for example a GitHub [Security Advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on the repository, or email if I list one on the site). Please avoid public issues that include exploit details.
