# Specification: Portal Core Components (Header, Hero Search & Cifras del Portal)

## 1. Overview
Specification for the three core portal components displayed on the FONAG SEDC (Sistema de Estandarización de Datos Crudos) landing page:
1. **Main Navigation Header** (Organism)
2. **Hero Section with SEDC Branding & Floating Search Capsule** (Organism)
3. **"Cifras del Portal" Stats Grid** (Organism with 4 Metric Card Molecules)

---

## 2. Component 1: Main Navigation Header (`.portal-header`)

### 2.1 Visual & Layout Anatomy
- **Container**: Max width `1366px`, centered, padding `1rem 1.5rem`. White surface background with subtle bottom border (`var(--color-palette-gray-soft)`).
- **Left (Brand Logo)**:
  - FONAG official vector logo: 3 curved waves with orange accent dot + "FON" (navy `#242857`) + "AG" (orange `#f19001`).
- **Center (Navigation Links)**:
  - Items:
    1. **Inicio** (Active state: bold Inter, `#242857`, with a 3px rounded orange underline indicator below).
    2. **Estaciones** (Medium Inter, `#5e6063`, hover: `#242857`).
    3. **Consultas** (Medium Inter, `#5e6063`, hover: `#242857`).
    4. **Tiempo Real** (Medium Inter, `#5e6063`, hover: `#242857`).
  - Font: `Inter`, 15px, letter-spacing `0px`.
  - Spacing: `2rem` gap between navigation items.
- **Right (Login Action)**:
  - Button: "Ingresar" (`.btn-nav-login`).
  - Target URL: `https://sedc.fonag.org.ec/login/?next=/`
  - Style: Rounded pill shape (`border-radius: 9999px`).
  - Background: Dark Navy (`#242857`, hover: `#1b1e42`).
  - Icon: Login icon (door with arrow entering) on the left of the label, 16px x 16px SVG, white.
  - Text: `font: normal normal bold 14px/20px Inter; color: #FFFFFF;`.
  - Padding: `0.5rem 1.25rem`.

---

## 3. Component 2: Hero Section with Search (`.hero-portal`)

### 3.1 Visual & Layout Anatomy
- **Background**:
  - High-resolution photographic landscape of the Andean paramo/watershed mountain range.
  - Dark blue gradient overlay: `linear-gradient(rgba(36, 40, 87, 0.65), rgba(36, 40, 87, 0.75))`.
  - Height: Min-height `480px` (or `42vw`), centered content, white text.
- **SEDC Brand Lockup**:
  - Horizontal lockup centered above the description:
    - Left block:
      - Title: **SEDC** in bold Orange (`#f19001`), font-size `44px`, font-weight `800`.
      - Subtitle: `FONAG - ECUADOR` in white, font-size `12px`, letter-spacing `1.5px`, uppercase.
    - Divider: Vertical 1px rule, height `40px`, light blue/cyan tint (`rgba(65, 166, 229, 0.5)`).
    - Right block:
      - Text: **Sistema de Estandarización de Datos Crudos** (white, font-size `22px`, font-weight `700`, line-height `26px`, max-width `340px`).
- **Descriptive Paragraph**:
  - Content: *"La red de monitoreo hidrometeorológico del FONAG generar información climática e hidrológica en las áreas de interés hídrico desde las cuales se abastece de agua el Distrito Metropolitano de Quito."*
  - Typography: `font: normal normal medium 15px/24px Inter; color: #FFFFFF; max-width: 720px; text-align: center; margin: 1.5rem auto 2.5rem;`.
- **Floating Search Capsule (Molecule - `.hero-search-capsule`)**:
  - Container: Pill shape (`border-radius: 9999px`), background `#FFFFFF`, width `100%`, max-width `580px`, box-shadow `0 8px 30px rgba(0, 0, 0, 0.25)`.
  - Padding: `6px 8px 6px 1.5rem`.
  - Magnifying Glass Icon: Left aligned, 20px x 20px SVG, stroke `#242857`.
  - Input: Borderless, transparent background, font `Inter 15px`, placeholder text, color `#242857`.
  - Action Button:
    - Text: **Buscar**
    - Style: Pill button (`border-radius: 9999px`), background `#f19001` (hover: `#d97d00`), color `#FFFFFF`, font `bold 14px Inter`, padding `0.65rem 2rem`.

---

## 4. Component 3: "Cifras del Portal" Stats Grid (`.stats-section`)

### 4.1 Section Heading
- Title: **Cifras del Portal**
- Typography: `font: normal normal bold 26px/32px Inter; color: #242857; text-align: center;`
- Accent: Orange underline indicator (`width: 48px; height: 4px; background-color: #f19001; border-radius: 2px; margin: 0.5rem auto 2.5rem;`).

### 4.2 Metric Cards Anatomy & Typography (Exact Requirement)
- **.stat-number**: `font: normal normal bold 22px/26px Inter; color: #242857;`
- **.stat-label**: `font: normal normal bold 13px/16px Inter; color: #f19001;`
- **.stat-desc**: `font: normal normal medium 13px/16px Inter; color: #242857;`

### 4.3 Metric Cards Grid (4 Columns)
- Layout: CSS Grid, 4 equal columns on desktop (`grid-template-columns: repeat(4, 1fr)`), collapsing to 2 columns on tablet, 1 column on mobile. Max container width `1366px`.
- Card Container (`.stat-card`):
  - Background: `#FFFFFF`.
  - Border-radius: `16px` (`var(--radius-xl)`).
  - Border: `1px solid #e8eaed`.
  - Box-shadow: `0 4px 16px rgba(36, 40, 87, 0.06)`.
  - Hover effect: `transform: translateY(-4px); box-shadow: 0 12px 24px rgba(36, 40, 87, 0.12);`.
  - Top Accent Bar: A centered 40px wide, 3px high cyan bar (`#41a6e5`) at the top edge.
  - Padding: `2rem 1.5rem 1.5rem`.
  - Alignment: Centered flex column.

### 4.3 Card Items Data & Layout
1. **Card 1: Años**
   - Icon: Circular badge with light cyan background (`#eaf6fd`), Bar Chart icon (`#41a6e5`).
   - Value & Title: **19** (Navy `#242857`, 32px, bold) + **Años** (Orange `#f19001`, 18px, bold).
   - Description: *"Resúmenes estadísticos anuales"* (`#242857`, 13px, line-height 18px, min-height 36px).
   - CTA: Orange pill button **Ver anuario** (`padding: 0.5rem 1.5rem; font-size: 13px; font-weight: 700;`).

2. **Card 2: Estaciones**
   - Icon: Circular badge (`#eaf6fd`), Cloud with rain icon (`#41a6e5`).
   - Value & Title: **61** (Navy `#242857`, 32px, bold) + **Estaciones** (Orange `#f19001`, 18px, bold).
   - Description: *"Meteorológicas, Pluviométricas e Hidrológicas activas"* (`#242857`, 13px, min-height 36px).
   - CTA: Orange pill button **Ver estaciones** (`padding: 0.5rem 1.5rem; font-size: 13px; font-weight: 700;`).

3. **Card 3: Variables**
   - Icon: Circular badge (`#eaf6fd`), Water droplet & gauge icon (`#41a6e5`).
   - Value & Title: **13** (Navy `#242857`, 32px, bold) + **Variables** (Orange `#f19001`, 18px, bold).
   - Description: *"Hidroclimáticas con información desde 2007"* (`#242857`, 13px, min-height 36px).
   - CTA: Orange pill button **Ver variables** (`padding: 0.5rem 1.5rem; font-size: 13px; font-weight: 700;`).

4. **Card 4: Telemetría**
   - Icon: Circular badge (`#eaf6fd`), Broadcast / telemetry waves icon (`#41a6e5`).
   - Value & Title: **20** (Navy `#242857`, 32px, bold) + **Estaciones con telemetría** (Orange `#f19001`, 15px, bold).
   - Description: *"Transmisión en tiempo real"* (`#242857`, 13px, min-height 36px).
   - CTA: Orange pill button **Ver transmisión** (`padding: 0.5rem 1.5rem; font-size: 13px; font-weight: 700;`).

---

## 5. Atomic Design Breakdown

| Level | Component | Location |
|---|---|---|
| **Atoms** | Pill Buttons (`.btn-cta-orange`, `.btn-nav-login`) | `src/css/atoms/buttons.css` |
| **Atoms** | Circular Icon Badges (`.icon-badge-cyan`) | `src/css/atoms/badges.css` |
| **Atoms** | Search Input & Icons | `src/css/atoms/inputs.css` |
| **Molecules** | Hero Floating Search Capsule (`.hero-search-capsule`) | `src/css/molecules/hero-search.css` |
| **Molecules** | Nav Links Group with Active Indicator (`.nav-menu`) | `src/css/molecules/nav-menu.css` |
| **Molecules** | Metric Card (`.stat-card`) | `src/css/molecules/stat-card.css` |
| **Organisms** | Portal Navigation Header (`.portal-header`) | `src/css/organisms/portal-header.css` |
| **Organisms** | Parallax / Overlay Hero Section (`.hero-portal`) | `src/css/organisms/hero-portal.css` |
| **Organisms** | "Cifras del Portal" Stats Grid (`.stats-section`) | `src/css/organisms/stats-section.css` |
