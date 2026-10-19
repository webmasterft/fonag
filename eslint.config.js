// Globals are declared explicitly (the `globals` package is not a dependency)
const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  localStorage: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  fetch: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  Blob: "readonly",
  FormData: "readonly",
  Request: "readonly",
  Response: "readonly",
  HTMLElement: "readonly",
  CSS: "readonly",
  getComputedStyle: "readonly",
  alert: "readonly",
  Event: "readonly"
};

const nodeGlobals = {
  process: "readonly",
  Buffer: "readonly",
  console: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  __dirname: "readonly"
};

const sharedRules = {
  "no-undef": "error",
  "no-unused-vars": "warn",
  "no-console": "off",
  "semi": ["error", "always"]
};

export default [
  {
    files: ["src/js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals
    },
    rules: sharedRules
  },
  {
    // Vercel Serverless Functions, Node scripts and the Vite config
    files: ["api/**/*.js", "scripts/**/*.js", "vite.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals
    },
    rules: sharedRules
  }
];
