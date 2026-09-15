# Design: Portal Components Architecture

## File Organization & Atomic Placement
```
src/
├── css/
│   ├── atoms/
│   │   ├── buttons.css          <-- Add .btn-nav-login (Navy pill with icon)
│   │   └── badges.css           <-- Circular icon badge (.icon-badge-cyan)
│   ├── molecules/
│   │   ├── nav-menu.css         <-- Navigation links with active orange indicator
│   │   ├── hero-search.css      <-- Floating capsule search bar with icon + input + button
│   │   └── stat-card.css        <-- Individual metric card with top cyan accent & CTA
│   └── organisms/
│       ├── portal-header.css    <-- Header organism with brand, nav-menu, login
│       ├── hero-portal.css      <-- Background image, SEDC lockup, and search integration
│       └── stats-section.css    <-- "Cifras del Portal" 4-column responsive grid
```

## Responsive Strategy
- Desktop (>= 1024px): 4-column stats grid, horizontal header with centered navigation, full lockup hero.
- Tablet (768px - 1023px): 2x2 stats grid, compressed nav items.
- Mobile (< 768px): 1-column stats stack, search capsule full-width, hamburger/scrollable nav.
