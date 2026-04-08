# Portfolio Site Audit

> **How to use:** Reference any issue by its code in a prompt, e.g. *"fix CON-2"* or *"fix JS-1, JS-2, and CSS-2"*.

---

## 1. Missing / Placeholder Content

**`CON-1` - No real photo in the About section** ✅ *Fixed - placeholder removed*
Photo placeholder has been removed. Add a real photo when ready.

**`CON-2` - All project GitHub links go to your profile, not specific repos** ✅ *Fixed - links removed*
GitHub icon links removed from all project cards. Add back individual repo links when repos go public.

**`CON-3` - No LinkedIn anywhere** - *Skipped (by choice)*
No LinkedIn account to add.

**`CON-4` - The Security Lab page (`lab.html`) is unreachable** ✅ *Fixed - lab.html, lab.css, lab.js deleted*

---

## 2. Navigation Problems

**`NAV-1` - Nav link order no longer matches page section order** ✅ *Fixed*

**`NAV-2` - Resume filename has a space and "(1)" in it** ✅ *Fixed - all references updated to `om-shah-resume.pdf`*

---

## 3. SEO & Social Sharing

**`SEO-1` - No favicon** ✅ *Fixed - `favicon.svg` created (green "OS" initials on dark background), linked in all pages*

**`SEO-2` - No Open Graph tags** ✅ *Fixed - `og:title`, `og:description`, `og:type` added to `index.html`*
> An OG image can be added later once you have a screenshot or photo to use.

**`SEO-3` - `lab.html` is missing a meta description** ✅ *Fixed - lab.html deleted*

---

## 4. JavaScript Code Quality

**`JS-1` - Stagger delay code runs outside `DOMContentLoaded`** ✅ *Fixed - moved into `initStaggerDelays()` called inside `DOMContentLoaded`*

**`JS-2` - Unused variable (`lastScroll`)** ✅ *Fixed - removed*

**`JS-3` - Two separate scroll listeners where one would do** ✅ *Fixed - merged into a single listener in `initNavbarScroll`*

**`JS-4` - CSS injected by JavaScript at runtime** ✅ *Fixed - `.animate-in` and `.nav-links a.active` moved to `styles.css`; `insertAdjacentHTML` calls removed*

---

## 5. CSS Issues

**`CSS-1` - Duplicate CSS rules between `styles.css` and `project-demos.html`** ✅ *Fixed - duplicate rules removed from inline `<style>` block; `styles.css` updated with correct values*

**`CSS-2` - About and Experience sections have the same background colour** ✅ *Fixed - Experience now uses `var(--bg-primary)` (darker) to create visual separation*

**`CSS-3` - No `font-display: swap` for Google Fonts** ✅ *Already present - `&display=swap` was already in the Google Fonts URL on all pages*

---

## 6. Accessibility

**`A11Y-1` - `<nav>` elements have no `aria-label`** ✅ *Fixed - `aria-label="Main navigation"` added to all pages*

**`A11Y-2` - The About photo placeholder pretends to be interactive** ✅ *Fixed - placeholder removed entirely (CON-1); hover style also removed from CSS*

**`A11Y-3` - Unlabelled `<label>` in `lab.html`** ✅ *Fixed - lab.html deleted*

---

## 7. Repository / File Size

**`GIT-1` - A huge binary file is committed to git (`dl_model.keras`)** ✅ *Fixed - `*.keras` added to `.gitignore`*
> Note: the file is still in your git history. To fully remove it from the repo, run:
> `git rm --cached "dl-spam-classifier-master/dl-spam-classifier-master/outputs/dl_model.keras"`
> then commit. The model is hosted on Hugging Face so the live demo still works.

**`GIT-2` - `spam-pipeline.svg` is untracked** - *Pending*
> Run `git add spam-pipeline.svg` and commit it - it's a project asset used on the site.

---

## 8. Polish / Minor Issues

**`POL-1` - Two redundant "See Project Demos" buttons** ✅ *Fixed - bottom CTA removed; card button updated to "⚡ Try Live Demo" with primary styling*

**`POL-2` - `lab.html` navbar missing the mobile menu toggle button** ✅ *Fixed - lab.html deleted*

---

## Summary Table

| Code | Area | Severity | Status | Issue |
|------|------|----------|--------|-------|
| `CON-1` | Content | High | ✅ Fixed | Photo placeholder removed |
| `CON-2` | Content | High | ✅ Fixed | GitHub links removed (no public repos yet) |
| `CON-3` | Content | High | - Skipped | No LinkedIn account |
| `CON-4` | Content | High | ✅ Fixed | lab.html deleted |
| `NAV-1` | Nav | Medium | ✅ Fixed | Nav order corrected |
| `NAV-2` | Content | Medium | ✅ Fixed | Resume filename updated |
| `SEO-1` | SEO | Medium | ✅ Fixed | favicon.svg created |
| `SEO-2` | SEO | Medium | ✅ Fixed | OG tags added (no image yet) |
| `SEO-3` | SEO | Low | ✅ Fixed | lab.html deleted |
| `JS-1` | JS | Medium | ✅ Fixed | Stagger code inside DOMContentLoaded |
| `JS-2` | JS | Low | ✅ Fixed | lastScroll removed |
| `JS-3` | JS | Low | ✅ Fixed | Scroll listeners merged |
| `JS-4` | JS | Low | ✅ Fixed | CSS moved to stylesheet |
| `CSS-1` | CSS | Medium | ✅ Fixed | Duplicate rules removed |
| `CSS-2` | CSS | Medium | ✅ Fixed | Experience section uses darker bg |
| `CSS-3` | CSS | Low | ✅ Already done | display=swap was already in URL |
| `A11Y-1` | Accessibility | Low | ✅ Fixed | aria-label added to all navs |
| `A11Y-2` | Accessibility | Low | ✅ Fixed | Placeholder and hover removed |
| `A11Y-3` | Accessibility | Low | ✅ Fixed | lab.html deleted |
| `GIT-1` | Git | High | ✅ Fixed | *.keras added to .gitignore |
| `GIT-2` | Git | Medium | ⏳ Pending | Run: `git add spam-pipeline.svg` |
| `POL-1` | Polish | Low | ✅ Fixed | "Try Live Demo" button, bottom CTA removed |
| `POL-2` | Mobile | Medium | ✅ Fixed | lab.html deleted |
