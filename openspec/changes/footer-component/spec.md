# Specification: FONAG Footer Component

## 1. Overview
The footer is an organism component adhering to Atomic Design principles. It provides corporate contact information, social channels, official branding, and a primary conversion action ("Contáctanos").

## 2. Visual & Structural Specifications (Based on Provided Design)

### 2.1 Color Palette & Tokens
- **Background**: Deep Navy Blue (`#1e244a`)
- **Text Color**: High-contrast White (`#ffffff`)
- **Divider**: Semi-transparent White Border (`rgba(255, 255, 255, 0.2)`)
- **Accent/CTA Button**: Vibrant Orange (`#f58220`, hover: `#d96b12`) with white text and `border-radius: 9999px` (pill shape).
- **Brand Logo Colors**: "FON" in White (`#ffffff`), "AG" and accent dot in Brand Orange (`#f58220`), waves in Silver/White.

### 2.2 Typography & Font Specifications (Exact Requirement)
- **Global Site Font**: `Inter` pulled directly from Google Fonts (`@import` or `<link>` with weights 400, 500, 600, 700, 800).
- **"Contacto" Heading**:
  - `font: normal normal bold 20px/24px Inter;`
  - `letter-spacing: 0px;`
  - `color: #FFFFFF;`
- **Other Footer Text (Phones, Address, Email, CTA)**:
  - `font: normal normal bold 15px/25px Inter;`
  - `letter-spacing: 0px;`
  - `color: #FFFFFF;`
- **Social Media Icons**:
  - Exact SVG dimensions: `20px` x `20px` (`width="20" height="20"`).
  - Channels: Facebook, X (Twitter), Instagram, TikTok.
  - Fill / Stroke: `#FFFFFF`.

### 2.3 Layout Hierarchy (Two-Tier Structure)

#### Tier 1: Contact & Social Info
- **Section Heading**: "Contacto"
- **Social Media Icons**: Facebook, X, Instagram, TikTok (20px x 20px).
- **Phone Column**:
  - `(593 2) 2430 233`
  - `(593 2) 2439 549`
- **Address Column**:
  - `Mariana de Jesús y Martí`
  - `Utreras.`
- **Email Column**:
  - `comunicacion@fonag.org.ec`

#### Divider
- 1px horizontal rule with subtle contrast against the navy background.

#### Tier 2: Brand & Call to Action
- **Left**: FONAG Official Logo (Vector SVG with responsive scaling).
- **Right**: "Contáctanos" Pill Button (`.btn-cta-orange`).
  - Size: Medium/Large (`padding: 0.75rem 2rem`).
  - Pill radius (`border-radius: 9999px`).
  - Outline ring / shadow on focus for WCAG 2.2 accessibility.

## 3. Atomic Design Taxonomy

### Atoms
- `social-icon.css`: Individual social link anchor with SVG and accessibility `aria-label`.
- `divider.css`: 1px rule separating upper and lower tiers.
- `cta-button.css` (`.btn-cta-orange`): Pill-shaped orange CTA button.

### Molecules
- `social-group.css`: "Contacto" title paired horizontally with social icon links.
- `contact-columns.css`: Flexible grid/flex container organizing phone, address, and email data.
- `brand-action-row.css`: Flex container aligning the FONAG logo on the left and the CTA button on the right.

### Organism
- `footer-fonag.css` (`src/css/organisms/footer.css`): Outer layout container with background token, max-width constraints, responsive stacking on mobile screens (< 768px).

## 4. Responsiveness & Accessibility
- **Desktop (>= 1024px)**: Horizontal multi-column layout exactly matching the design spec.
- **Tablet (768px - 1023px)**: 2x2 grid for contact columns; logo and CTA remain horizontally aligned.
- **Mobile (< 768px)**: Stacked single-column layout with centered or start-aligned elements, ensuring touch targets >= 44x44px.
- **A11y**:
  - Contrast ratio >= 4.5:1 between text and `#1e244a` background.
  - Meaningful `aria-label`s on all social media icons.
  - Keyboard focus rings visible against dark background.
