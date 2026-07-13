# Security policy

For a plain-language overview of how I harden this site (CSP, integrity checks, demo API allowlist, and privacy notes), see **[security.md](security.md)**.

## Maintainer notes

When upgrading Three.js, update the **`importmap`** JSON in **`index.html`** (same block in **`project-demos.html`** CSP if you add a map there), then recompute the CSP **`sha256-...`** for that exact script text so `script-src` still allows it. **`cdn.jsdelivr.net`** must stay in **`script-src`**.

**`frame-ancestors`** cannot be set in a `<meta>` CSP (browsers ignore it and log an error). To restrict who may embed the site in an iframe, send it as a real **HTTP response header** (for example a Cloudflare **Transform Rule** or **Workers** response header: `Content-Security-Policy: frame-ancestors 'self'`).

**Three.js SRI:** The Three.js import map (`<script type="importmap">`) does not support `integrity` attributes — the Import Map Integrity spec is not yet implemented by browsers. GoatCounter has SRI because it uses a standard `<script src>` tag. If the site is ever migrated off GitHub Pages to a platform that supports response headers, consider self-hosting Three.js and serving it with SRI, or revisit once import map integrity ships in major browsers.

When editing the inline `<script>` in **`dns-tunnel-demo.html`**, recompute its CSP `sha256-...` hash. Run: `node -e "const fs=require('fs'),c=require('crypto'),h=fs.readFileSync('dns-tunnel-demo.html','utf8').match(/<script>([\\s\\S]*?)<\\/script>/);console.log('sha256-'+c.createHash('sha256').update(h[1],'utf8').digest('base64'))"`

## Reporting a vulnerability

If you believe you have found a security vulnerability in this project, please contact me through a **private** channel (for example a GitHub [Security Advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on the repository, or the address in [`.well-known/security.txt`](.well-known/security.txt)). Please avoid public issues that include exploit details.
