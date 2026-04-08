# Portfolio (Om Shah)

Static site: cybersecurity and automation background, projects (including ML demo), resume links, and contact details.

## Local preview

Open `index.html` in a browser, or serve the folder with any static file server.

## Deployment

### GitHub Pages (this site, `portfolio` repo)

**Live site (canonical):** **https://omshahinfo.com/** (apex, no `www`; browsers add `https://` automatically.)

The same site is also available via GitHub Pages at **https://0m-5hah.github.io/portfolio/** until DNS is fully switched. A **`CNAME`** file in the repo root points **`omshahinfo.com`** at GitHub Pages; configure the custom domain and DNS as in your registrar (A records for `@` to GitHub’s IPs).

1. On GitHub, create a **public** repository named **`portfolio`**. Do not add a README, `.gitignore`, or license when GitHub offers templates (this folder already has a first commit).

2. In this folder on your machine, connect the remote and push (HTTPS or SSH):

   ```bash
   cd path/to/portfolio
   git remote add origin https://github.com/0m-5hah/portfolio.git
   git push -u origin main
   ```

   If you already added a different `origin` (for example `0m-5hah.github.io`), replace it:

   ```bash
   git remote remove origin
   git remote add origin https://github.com/0m-5hah/portfolio.git
   git push -u origin main
   ```

3. On the **`portfolio`** repo: **Settings → Pages → Build and deployment → Source** → **Deploy from a branch** → branch **`main`**, folder **`/` (root)** → Save.

4. After a minute or two, open **https://omshahinfo.com/** or **https://0m-5hah.github.io/portfolio/** (use a trailing slash if needed the first time).

**Optional:** A repo named **`0m-5hah.github.io`** (exactly) would serve the site at **`https://0m-5hah.github.io/`** with no `/portfolio` path. This project uses relative asset links, so either layout works.

A **`.nojekyll`** file is included so GitHub serves static files without Jekyll processing.

### Netlify / Vercel

1. Connect your repository
2. Deploy with default settings
3. Custom domain optional

## Color Scheme

Modify `styles.css` CSS variables to change colors:

```css
:root {
    --accent-primary: #00ff88;    /* Main accent (green) */
    --accent-secondary: #00d4ff;  /* Secondary accent (cyan) */
    --accent-tertiary: #8b5cf6;   /* Tertiary accent (purple) */
}
```

## Browser Support

- Chrome, Firefox, Safari, Edge (latest versions)
- Responsive design for mobile devices

## License

Free to use for personal portfolios.
