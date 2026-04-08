# Agent handoff: GitHub Pages custom domain (`omshahinfo.com`)

Use this document to continue debugging **GitHub Pages → Custom domain** for the portfolio repo. Copy the whole file into a new chat if needed.

## Status (owner)

**Resolved:** DNS + GitHub verification succeeded after **removing** the custom domain in **Settings → Pages** and **re-entering / saving** `omshahinfo.com` (forces GitHub to re-run checks). Public DNS was already correct; GitHub’s UI was stale.

**Keep live:** Repo **`main`** stays the Pages source; any push to **`main`** redeploys the site. In **Settings → Pages**, keep **Enforce HTTPS** **on** once offered.

---

## 1. Facts (do not guess)

| Item | Value |
|------|--------|
| **GitHub user** | `0m-5hah` |
| **Repository** | `portfolio` |
| **Repo URL** | `https://github.com/0m-5hah/portfolio` |
| **Pages type** | **Project site** (published at `https://0m-5hah.github.io/portfolio/` without custom domain) |
| **Publishing** | Branch **`main`**, folder **`/` (root)** |
| **Custom domain (intended)** | **`omshahinfo.com`** (apex, canonical; no `www` in marketing copy) |
| **Registrar** | **Namecheap** |
| **DNS mode** | **Namecheap BasicDNS** (nameservers must point at Namecheap so **Advanced DNS** applies) |
| **Repo file** | Root **`CNAME`** contains exactly one line: `omshahinfo.com` |

---

## 2. Goal

- Visitors open **`https://omshahinfo.com/`** (not `github.io`).
- **Settings → Pages** shows custom domain **verified** (no red DNS error).
- **Enforce HTTPS** can be turned **on**.

---

## 3. Current GitHub UI symptoms (typical failure state)

When DNS is wrong or not yet visible to GitHub, **Settings → Pages → Custom domain** shows:

- Red: **“DNS check unsuccessful”**
- Red box: **“Both omshahinfo.com and its alternate name are improperly configured. Domain does not resolve to the GitHub Pages server … (NotServedByPagesError).”**
- **Check again** button present
- **Enforce HTTPS** unchecked and disabled, with text like: **“Unavailable … domain is not properly configured to support HTTPS”**

**Interpretation:** GitHub’s automated check does not see **both** the **apex** and the **`www`** “alternate” as correctly pointing at GitHub Pages. Until that passes, HTTPS enforcement stays off.

---

## 4. Required DNS (Namecheap → Advanced DNS → Host Records)

### 4.1 Apex `omshahinfo.com` (Host `@`)

Exactly **four** **A** records (same host, four rows):

| Type | Host | Value |
|------|------|--------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

(These are GitHub Pages’ documented IPv4 endpoints; see GitHub Docs “Managing a custom domain”.)

### 4.2 `www.omshahinfo.com` (Host `www`)

**One** **CNAME** record:

| Type | Host | Value |
|------|------|--------|
| CNAME | `www` | `0m-5hah.github.io` |

**Critical:** Target is **`USERNAME.github.io`**, **not** `USERNAME.github.io/portfolio`.

### 4.3 Must remove or avoid

- **Domain** tab (Namecheap): **Redirect Domain** rule **`omshahinfo.com` → `http://www.omshahinfo.com/`** (or any apex → www **URL redirect**). That prevents apex from answering as normal **A** records for GitHub’s check.
- **Advanced DNS:** **`www`** → **`parkingpage.namecheap.com`** (parking).
- **Advanced DNS:** Any **`@`** **A** record whose value is **not** one of the four GitHub IPs above (e.g. old parking IP like `162.255.x.x`).
- Duplicate or conflicting **`@`** records of types that override **A** (depends on provider; keep only what GitHub Docs allow for apex).

---

## 5. Independent verification (before blaming GitHub)

Run from any machine or use [dnschecker.org](https://dnschecker.org) for **A** on `omshahinfo.com` and **CNAME** on `www.omshahinfo.com`.

**Windows (example resolver Google `8.8.8.8`):**

```text
nslookup omshahinfo.com 8.8.8.8
nslookup www.omshahinfo.com 8.8.8.8
```

**Expected when correct:**

- **Apex** returns **only** addresses from **`185.199.108.153` … `185.199.111.153`** (often all four).
- **`www`** is a **CNAME** to **`0m-5hah.github.io`** (may then resolve to the same GitHub IPs or IPv6; that is normal).

**If public DNS is correct but GitHub still shows `NotServedByPagesError`:** treat as **propagation**, **TTL**, or **stale check** on GitHub’s side — see section 7.

---

## 6. GitHub repository checks

1. **`CNAME`** at **repo root** on branch **`main`**: single line `omshahinfo.com` (no `https://`, no trailing path).
2. **Settings → Pages:** **Source** = deploy from **`main`**, **`/` root**.
3. **Settings → Pages → Custom domain** field = **`omshahinfo.com`** (Save). Same string as **`CNAME`** file.

---

## 7. Remediation order (for the agent)

1. **Namecheap → Domain →** ensure **no URL redirect** on apex competing with GitHub (section 4.3).
2. **Namecheap → Advanced DNS:** apply section 4.1 and 4.2; **Save all changes**.
3. Wait **15 minutes to several hours** (occasionally up to **48 hours** for full propagation).
4. **GitHub → Settings → Pages →** click **Check again**.
5. If still failing after global DNS looks correct: **Remove** custom domain → **Save** → re-enter **`omshahinfo.com`** → **Save** to force a new verification cycle.
6. When the red DNS error clears, enable **Enforce HTTPS** and confirm **`https://omshahinfo.com`** loads with a valid certificate.

---

## 8. If still broken after 24–48 hours

- Re-read [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) for any 2025 UI changes.
- Confirm **no other GitHub repo** uses the same custom domain (one domain → one Pages site).
- Check **CAA records** at the registrar: if present, they must allow **Let’s Encrypt** issuance (GitHub uses automated HTTPS). Overly strict CAA can block certs **after** DNS passes; rare for fresh domains.
- Open a **GitHub Community** thread or support with: repo name, domain, screenshot of Pages, and output of `dig` / `nslookup` from two regions.

---

## 9. Official documentation (bookmark)

- [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [About custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)
- Search GitHub Docs for: **troubleshooting custom domains** (article slug may change).

---

## 10. Site content / SEO (already in repo)

Canonical and Open Graph URLs in **`index.html`**, **`project-demos.html`**, **`spam-model.html`** use **`https://omshahinfo.com/...`**. After the domain goes green, no extra HTML change is required for basic correctness.

---

## 11. Privacy

A custom domain does **not** hide the repository. **Public** repo = cloneable. **Private** repo + Pages may require a **paid** GitHub plan; confirm under **Settings → Pages**.

---

## 12. Success criteria (definition of done)

- **Settings → Pages:** custom domain shows **without** red `NotServedByPagesError` / DNS unsuccessful.
- **Enforce HTTPS** is **enabled**.
- Browsers load **`https://omshahinfo.com/`** with a valid certificate and the portfolio content.
