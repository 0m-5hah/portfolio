# Cybersecurity Portfolio

A professional, modern portfolio website designed for cybersecurity professionals.

## Quick Start

1. Open `index.html` in your browser to preview
2. Customize the content with your information
3. Deploy to GitHub Pages, Netlify, or Vercel

## Customization

### Personal Information

Edit `index.html` and replace:

- **"Your Name"** - Your actual name
- **"your.email@example.com"** - Your email address
- **"Your University Name"** - Your school/university
- **Social links** - Update href attributes with your profiles

### Profile Photo

Replace the placeholder in the About section:

```html
<div class="image-placeholder">
    <!-- Replace with: -->
    <img src="your-photo.jpg" alt="Your Name" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
</div>
```

### Projects

Update the project cards with your actual projects:
- Change titles and descriptions
- Update GitHub/demo links
- Modify technology tags

### Certifications

Replace placeholder certifications with your actual credentials:
- CompTIA Security+, CEH, OSCP, etc.
- Adjust dates and descriptions

### Statistics

Update the numbers in the About section stats to reflect your actual achievements.

## Deployment

### GitHub Pages (this site — `portfolio` repo)

This project is meant to live in a repository named **`portfolio`**, so the public URL is:

**https://0m-5hah.github.io/portfolio/**

(That is GitHub’s pattern: `https://<username>.github.io/<repo-name>/` for project sites.)

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

4. After a minute or two, open **https://0m-5hah.github.io/portfolio/** (use the trailing slash or open `/portfolio/index.html` if needed the first time).

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
