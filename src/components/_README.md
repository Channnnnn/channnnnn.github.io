`src/components` directory store you usual reusable building blocks of your Astro site.

Similar to Vue.JS, `.astro` file have 2 sections. Component script and HTML template separated by code fence `---`.
These are SSG template. Component script will run at build-time. No client-side JS (hence "fenced" 🥁).

Unless...
Script tags in HTML section, with `is:inline` attribute, it will run on browser.

```astro
---
// Component Script (JavaScript, Server-side/SSG)
---
<!-- Component Template (HTML + JS Expressions) -->

```

Read more: [Astro Components](https://docs.astro.build/en/basics/astro-components/)
