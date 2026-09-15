# Design: Architecture and File Hierarchy

## Directory Tree
```
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── openspec/
│   └── changes/
│       └── init-app/
│           ├── proposal.md
│           ├── spec.md
│           ├── design.md
│           └── tasks.md
└── src/
    ├── css/
    │   ├── main.css
    │   ├── tokens/
    │   │   ├── colors.css
    │   │   ├── typography.css
    │   │   ├── spacing.css
    │   │   └── index.css
    │   ├── atoms/
    │   │   ├── buttons.css
    │   │   └── inputs.css
    │   ├── molecules/
    │   │   ├── card.css
    │   │   └── search-field.css
    │   ├── organisms/
    │   │   ├── header.css
    │   │   └── hero.css
    │   └── templates/
    │       └── layout.css
    └── js/
        ├── main.js
        ├── atoms/
        │   └── button.js
        ├── molecules/
        │   └── search.js
        └── organisms/
            └── theme-toggle.js
```

## Token Contract
- Native CSS variables in `:root` and `[data-theme="dark"]`.
- Direct binding in `@theme` block in `src/css/main.css` for Tailwind v4 utility parity.
