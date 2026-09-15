# Design: Footer Component Architecture

## File Organization
```
src/
├── css/
│   ├── tokens/
│   │   └── colors.css          <-- Add --color-footer-bg, --color-brand-orange
│   ├── atoms/
│   │   ├── buttons.css         <-- Add .btn-cta-orange (pill variant)
│   │   └── social-icon.css     <-- Social icon link atom
│   ├── molecules/
│   │   ├── contact-group.css   <-- Grouping for phone/address/email/social
│   ├── organisms/
│   │   └── footer.css          <-- Main footer organism container & two-tier layout
└── assets/
    └── icons/                  <-- SVGs for Facebook, X, Instagram, TikTok, FONAG logo
```

## HTML Structure Outline
```html
<footer class="fonag-footer">
  <div class="footer-container">
    <!-- Tier 1: Contact info & Social -->
    <div class="footer-tier-top">
      <div class="footer-col footer-col-social">
        <h3 class="footer-heading">Contacto</h3>
        <div class="footer-social-list">...</div>
      </div>
      <div class="footer-col footer-col-phones">...</div>
      <div class="footer-col footer-col-address">...</div>
      <div class="footer-col footer-col-email">...</div>
    </div>

    <!-- Divider -->
    <hr class="footer-divider" />

    <!-- Tier 2: Brand & CTA -->
    <div class="footer-tier-bottom">
      <div class="footer-brand">...</div>
      <div class="footer-cta">
        <a href="#contacto" class="btn btn-cta-orange">Contáctanos</a>
      </div>
    </div>
  </div>
</footer>
```
