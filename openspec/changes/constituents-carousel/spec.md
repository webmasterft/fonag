# Specification: Nuestros Constituyentes Carousel Component

## 1. Overview
An organism component showcasing the founding and partner institutions of FONAG. Uses **Embla Carousel** for dependency-free, smooth touch-enabled sliding.

## 2. Typography & Color Specifications
- **Eyebrow**:
  - `font: 500 13px/16px Inter, sans-serif;`
  - `color: #F19001;`
  - Text: *"Una alianza por el agua"*
- **Title**:
  - `font: 700 20px/24px Inter, sans-serif;`
  - `color: #242857;`
  - Text: *"Nuestros constituyentes"*
  - Accent Underline: Centered 48px wide, 3px high orange bar (`#F19001`).
- **Description**:
  - `font: 500 13px/16px Inter, sans-serif;`
  - `color: #242857;`
  - `opacity: 0.8;`
  - Text: *"Instituciones comprometidas con la protección, restauración y gestión sostenible de las fuentes de agua del Distrito Metropolitano de Quito."*
  - Max-width: `640px`, centered.

## 3. Carousel Specifications (Embla Carousel)
- **Engine**: `embla-carousel` (v8+, native ES Module, zero jQuery overhead).
- **Container Box**:
  - Background: Soft off-white / light slate (`#f8fafc`).
  - Border: `1px solid #efefef`.
  - Border-radius: `16px`.
  - Padding: `2.5rem 1.5rem`.
- **Navigation Controls**:
  - Left / Right circular pill buttons (`40px` diameter).
  - Background: `#ffffff`, subtle shadow `0 2px 8px rgba(0,0,0,0.08)`.
  - Icons: Chevron left/right SVGs in brand orange (`#F19001`).
- **Partner Badges (Slides)**:
  - Shape: Circular badge (`110px` x `110px`).
  - Background: `#ffffff`.
  - Border: `1px solid #f1f5f9`.
  - Box-shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`.
  - Hover: `transform: scale(1.05); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);`.
  - Logos Included:
    1. CAMAREN
    2. The Nature Conservancy
    3. Tesalia cbc
    4. Epmaps Quito
    5. Empresa Eléctrica Quito
    6. Cervecería Nacional
    7. ENLACE
