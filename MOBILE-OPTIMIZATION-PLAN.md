# Mobile optimization plan

Planning document only. No implementation steps are executed here. Use this as the checklist before changing `index.html`, `project-demos.html`, `styles.css`, or shared `script.js`.

## Why this matters

Analytics show a large share of visits from phones and large phones or tablets (often over half of sessions). The site already uses `width=device-width` and has a mobile nav breakpoint at **768px**, plus demo-specific tightening at **720px**, but the experience is not yet **mobile-first**: layouts and interactions were designed for desktop and adapted down. The goal is to make small viewports a first-class target without breaking large screens.

## Current technical snapshot

| Area | Notes |
|------|--------|
| **Global CSS** | `styles.css` is large; breakpoints include **380px**, **520px**, **640px**, **720px** (demo), **768px** (nav), **1024px**, **1199px**, **1280px** (3-column projects grid), **1400px** (3D phone slot). |
| **Home** | `index.html`: hero, about, experience, projects (grid, filters, featured card), papers carousel, skills, contact. |
| **Live demo** | `project-demos.html`: tool-first compact rules at **≤720px**; still validate tap targets, overflow, and API panels on narrow devices. |
| **Scripts** | `script.js` (nav, scroll, analytics, project filter); `phone-showcase-loader.js` / Three.js only where enabled (large desktop). |

## Can we show a different site for mobile users?

**Yes, but the mechanism matters.** You can deliver a different *experience* on small screens in several ways. They are not equally maintainable or safe for SEO.

### Option A: One site, different layout (recommended default)

Same HTML and URL for everyone; **CSS** (and sometimes a little JS) changes layout below breakpoints. This is what the plan assumes for Phases 1 to 5.

- **Pros**: Single source of truth, no duplicate content, crawlers see one page, works on GitHub Pages with no extra infrastructure.
- **Cons**: HTML may still carry markup that only desktop uses (you can hide it visually on mobile).

### Option B: Same domain, separate mobile pages

Examples: `mobile.html`, `/m/index.html`, or parallel copies of key pages tuned for phones.

- **How**: Links point to the mobile version, or a **client-side** script runs early: `if (window.matchMedia('(max-width: 768px)').matches) location.replace('/m/')` (viewport-based, not “mobile user” in the network sense).
- **Pros**: You can radically simplify markup for small screens.
- **Cons**: **Two pages to keep in sync**; risk of outdated mobile copy; possible **duplicate content** if both rank unless you use `canonical` carefully; a viewport redirect can **flash** the wrong page before JS runs unless you add server or edge logic.

**User-Agent sniffing** (treating “mobile” as a browser string) is fragile: tablets, foldables, and desktop narrow windows break assumptions; crawlers may not match what you expect. Avoid as the primary switch.

### Option C: Subdomain or separate origin

Examples: `m.yourdomain.com` or a different host.

- **How**: Usually needs **edge or server config** (reverse proxy, Cloudflare Worker, Netlify redirect rules, etc.) to route by device or to always serve the subdomain for marketing. GitHub Pages alone does not offer first-class device-based routing; you add another layer in front.
- **Pros**: Clear split for analytics and caching.
- **Cons**: Highest operational cost; same duplication and SEO care as Option B unless mobile URLs are clearly secondary with `canonical` pointing at the main article URLs.

### Option D: “Adaptive” HTML from the server

The server returns different HTML for the same URL based on headers (sometimes `User-Agent` or Client Hints).

- **Pros**: No client-side flash if done correctly.
- **Cons**: Not available on **static-only** GitHub Pages without an edge compute layer; **maintenance and testing burden**; Google expects **equivalent** content if URLs are the same (avoid looking like cloaking: do not hide important text from one class of users).

### Recommendation for this repository

Treat **Option A** as the main strategy: improve `styles.css` (and small HTML tweaks) so phones get a polished layout **without** maintaining a second site.

If you still want a **radically** different mobile product later, prefer **explicit URLs** (Option B) plus `link rel="canonical"` on the mobile variant to the primary page, or use **edge redirects** you control and document, rather than opaque User-Agent branching.

### Checklist if you choose a separate mobile site (B or C)

- [ ] Define whether “mobile” means **viewport width**, **User-Agent**, or **user choice** (e.g. “Desktop site” link).
- [ ] Keep **content parity** or explain gaps; align titles and meta descriptions to avoid confusing search results.
- [ ] Set **canonical** URLs so the main page is the preferred index target unless you intentionally want two indexed experiences.
- [ ] Update **analytics** so both properties or paths are visible and funnels still make sense.
- [ ] Document redirects and hosting steps next to `CNAME` / DNS so future you knows how traffic is split.

## Principles (apply to every phase)

1. **Touch targets**: Aim for at least **44×44 CSS px** for primary actions (buttons, nav items, carousel affordances). Increase padding where controls feel tight.
2. **Readable type**: Minimum body text around **16px** on small screens; avoid long lines without breaks; respect user font scaling where possible.
3. **Safe areas**: Use `env(safe-area-inset-*)` for fixed chrome (nav, sticky footers) so notches and home indicators do not clip content. Demo main already uses insets in places; extend consistently on the home page if needed.
4. **No horizontal scroll**: Audit overflow on **320px** and **360px** widths; fix wide tables, preformatted text, and flex gaps that refuse to wrap.
5. **Performance on mobile**: Large hero animations, blur, and shadows cost more on phones; prefer simpler motion or `prefers-reduced-motion` (already partially used).
6. **One column by default**: Treat single-column layout as the default below a chosen “large phone” breakpoint; multi-column only when space is clearly sufficient.

## Phase 0: Discovery and baseline

**Objective**: Know what is broken before redesigning.

- [ ] **Device matrix**: Test on a real small phone (e.g. 360×640 logical), a large phone (e.g. 390×844), and a tablet portrait. Optionally add Android Chrome and iOS Safari.
- [ ] **Lighthouse (mobile)**: Run on `/` and `/project-demos.html`; record Performance, Accessibility, Best Practices, and SEO. Save scores as baseline.
- [ ] **Manual pass**: Scroll full home and demo pages; note overflow, clipped text, overlapping badges, and any control that requires pinch-zoom.
- [ ] **Network**: Optional throttling (Fast 3G) to see font and script load impact.

Deliverable: short list of **P0** (blocks use) vs **P1** (polish) issues tied to specific sections.

## Phase 1: Navigation and global chrome

**Objective**: Every page is easy to move around with a thumb.

- [ ] **Mobile menu**: Confirm focus trap or focus return when opening or closing; ensure `aria-expanded` stays correct; verify menu height and scroll if many links are added later.
- [ ] **Sticky header**: Check that fixed nav does not obscure in-page targets; `scroll-padding-top` on `html` already exists; re-verify after any nav height change.
- [ ] **Brand and controls**: Ensure tap targets for logo and menu button do not overlap on narrow widths.

Files: `index.html`, `project-demos.html`, `styles.css` (768px block and shared `.navbar` rules), `script.js` (mobile menu).

## Phase 2: Home page, top to bottom

**Objective**: Hero through contact read well on a phone.

- [ ] **Hero**: Title scale, terminal or decorative blocks, and primary CTAs; avoid content taller than one viewport without a clear scroll cue.
- [ ] **About and experience**: Stacks, stat rows, and inline links; wrapping and spacing at **≤640px** and **≤380px**.
- [ ] **Projects**: Grid should be a single column on small screens; featured card already drops to one column in places; confirm **project filter** row wraps and remains tappable (superscript counts, slash separators).
- [ ] **Project cards**: Padding, badge rows, dual buttons (“Watch demo”, “Capstone journal”); avoid horizontal scrolling inside cards.
- [ ] **Papers carousel**: Horizontal scroll or auto-scroll plus touch; ensure keyboard and screen reader labels remain accurate; test pause on hover or touch equivalents.
- [ ] **Skills and contact**: Matrix or grid cells; mailto and social links as large enough targets; resume link prominence.

Files: primarily `styles.css` (sections tied to `.hero`, `.about`, `.experience`, `.projects`, `.papers`, `.skills`, `.contact`) and minor `index.html` only if structure must change for accessibility.

## Phase 3: Live demo page (`project-demos.html`)

**Objective**: The main conversion path works on phones.

- [ ] Re-read rules under **`@media (max-width: 720px)`** for `.page-demo`; list what is hidden and whether anything critical is lost.
- [ ] **Analyze** flow: textarea size, loading state, result panels, batch UI, credibility panel toggles.
- [ ] Long error or JSON traces: wrap or collapse on narrow widths.
- [ ] Cross-links to PDFs and back to home: spacing and tap targets.

Files: `project-demos.html`, `project-demos.js`, `styles.css` (demo blocks).

## Phase 4: Performance and polish

**Objective**: Fast enough and calm on low-end phones.

- [ ] **Images and media**: Lazy loading where appropriate; poster or static fallback if video or heavy assets block first paint.
- [ ] **Fonts**: `preconnect` is present; consider `font-display` and subsetting if Lighthouse flags render delay.
- [ ] **Third-party scripts**: GoatCounter is async; keep CSP and SRI aligned when URLs change (`SECURITY.md` / `security.md` maintainer notes).
- [ ] **Motion**: Respect `prefers-reduced-motion` for any new animations.

## Phase 5: Verification and regression

- [ ] Re-run Lighthouse mobile on the same URLs as Phase 0; compare.
- [ ] Quick desktop pass at **1280px** and **1400px+** so projects grid and phone showcase layouts match expectations.
- [ ] If analytics events were added for funnels, spot-check that mobile navigation still fires expected paths (no duplicate or missing events).

## Risks and decisions to make early

1. **Breakpoint consolidation**: Many widths (**380, 520, 640, 720, 768, 1024**) can make behavior hard to predict. Decide whether to document a **single “phone” band** (e.g. max-width **640px** or **768px**) for layout defaults and keep narrower tweaks only where proven necessary.
2. **3D phone showcase**: Intentionally disabled below **1400px**; on smaller viewports, ensure the grid does not leave an odd empty gap or confusing order when the slot is hidden.
3. **Scope creep**: Prefer CSS and small markup fixes before adding new JavaScript for layout.
4. **Dual-site maintenance**: If you add a separate mobile site (see section above), every content or security change must be applied in two places unless you generate pages from a template.

## Suggested order of implementation (after this plan is approved)

1. Phase 0 baseline and P0 list  
2. Phase 1 navigation  
3. Phase 2 projects, filters, and carousel (highest content complexity on home)  
4. Phase 3 demo page  
5. Phase 4 performance  
6. Phase 5 verification  

---

*This file is a living plan: update checkboxes and notes as work completes.*
