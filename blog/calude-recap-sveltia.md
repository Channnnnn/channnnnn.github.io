---
title: "Building a Blog with Sveltia CMS, Astro, and Shiki: A Complete Walkthrough"
description: "From a static HTML template to a fully functional Astro blog with syntax-highlighted code, client-side Markdown preview, and proper image handling — everything we built and why."
author: "Claude did it for me"
thumbnail: https://camo.githubusercontent.com/c31dd47454c47ec4e9ea275fdea8a79e233c319667127405637074df88d645ce/68747470733a2f2f7376656c746961636d732e6170702f696d616765732f686967686c69676874732f636f7665722e77656270
category: "Tutorial"
tags: ["Astro", "Sveltia CMS", "Shiki", "Blogging", "Tutorial"]
---

This post documents the complete process of building a production-ready blog frontend powered by [Sveltia CMS](https://github.com/sveltia/sveltia-cms) and [Astro](https://astro.build). It covers the design system, syntax highlighting setup, a client-side Markdown preview tool, image handling, and a few gotchas worth knowing before you start.

Everything here was built iteratively — the way real projects actually develop.

## The design system

The blog uses a deliberate three-color palette:

| Role | Value | Usage |
|---|---|---|
| Background | `#F2F1EE` | Warm light gray base |
| Text | `#1A1917` | Near-black for body and headings |
| Accent | `#3D6B35` | Deep sage green for links, labels, CTAs |

The palette was chosen for contrast ratio compliance — the accent on the background exceeds WCAG AA at all tested sizes. Emphasis is handled through weight and scale rather than additional colors.

Typography uses **Libre Baskerville** (serif) for headlines and article body — giving the publication a classical, considered voice — paired with **DM Sans** for all UI chrome: navigation, metadata, tags, and bylines.

The full template is a self-contained `blog-template.html` with two views:

1. **Homepage** — hero post, 3-column post grid, numbered editorial picks, newsletter strip, footer
2. **Article page** — breadcrumb, byline, full article body with code blocks

## Syntax highlighting with Shiki

For syntax highlighting, **Shiki** is the right choice for an SSG setup. It runs at build time and outputs plain HTML with inline styles — no JavaScript shipped to the browser, no flash of unstyled code.

Astro ships with Shiki built in. Configuration is minimal:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: false,
    },
  },
});
```

Install the MDX integration:

```bash
npm install @astrojs/mdx
```

That is all Astro needs. Every fenced code block in your Markdown or MDX renders as highlighted HTML at build time.

### The code block UI

Raw Shiki output is a `<pre>` tag with inline styles. To add language labels and copy buttons, the template wraps each block in a `.code-block` div with a `.code-header`. The copy button uses the Clipboard API:

```js
document.querySelectorAll('.code-copy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const code = btn.closest('.code-block')?.querySelector('code')?.innerText ?? '';
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    });
  });
});
```

### Client-side highlighting for the preview tool

For the Markdown preview page, Shiki runs in the browser via ESM CDN — no build step involved:

```js
import { codeToHtml } from 'https://esm.sh/shiki@1';
import { marked }      from 'https://esm.sh/marked@12';

const renderer = new marked.Renderer();

renderer.code = async ({ text, lang }) => {
  return await codeToHtml(text, {
    lang: lang || 'text',
    theme: 'github-light',
  });
};

marked.use({ renderer, async: true });
const html = await marked.parse(markdownString);
```

This is appropriate specifically for the preview tool — a build-time approach remains better for production pages.

## The Markdown preview page

`preview.html` is a standalone static page that accepts a `.md` or `.mdx` file upload and renders it as a full blog post in the browser. It handles:

- **Frontmatter parsing** — title, author, pubDate, category, and tags are extracted from the YAML block and rendered into the article byline
- **Full Markdown rendering** — paragraphs, headings, lists, blockquotes, tables, inline code, images, and horizontal rules
- **Shiki code blocks** — all fenced blocks are highlighted client-side with language labels injected per block
- **Word count and reading time** — calculated from the raw body text
- **Duplicate title suppression** — if frontmatter has a `title` field, the first `<h1>` in the rendered body is removed to prevent repetition

Drop it in `public/` and Astro serves it at `/preview` with no build step.

## The BlogPost layout

`src/layouts/BlogPost.astro` is the layout Sveltia CMS content flows through. It reads from frontmatter:

```astro
---
const { frontmatter } = Astro.props;
const { title, author, authorInitials, pubDate, category, tags, minutesRead } = frontmatter;
---
```

The `authorInitials` field is a manual field for now — a future improvement would derive it automatically from the `author` string in the layout itself rather than requiring it in frontmatter.

## Image handling

This is the most nuanced part of the setup. The behavior depends on where images live:

**`public/images/`** — simple string paths, works everywhere including plain `.md` files:

```md
![Hero image](/images/posts/hero.jpg)
```

Configure Sveltia's media settings so the CMS writes the correct path prefix:

```yaml
media_folder: public/images/posts
public_folder: /images/posts
```

**`src/assets/` or co-located with content** — enables Astro's image optimization pipeline, but requires schema validation and relative paths in frontmatter:

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  schema: ({ image }) => z.object({
    cover: image().optional(),
  }),
});
```

```md
---
cover: "./images/hero.jpg"
---
```

Then in Sveltia's config:

```yaml
media_folder: src/content/blog/images
public_folder: ./images
```

The `./` prefix is critical — it tells Sveltia to write a relative path, which Astro's image schema can resolve through its build pipeline. Plain `/images/...` paths bypass this entirely.

> Sveltia does not have a `~` root shortcut like C#. The closest equivalent is an absolute path with a leading `/` via `public_folder` — which resolves from the site root regardless of content file depth.

## Packages used

| Package | Version | Purpose |
|---|---|---|
| `astro` | latest | SSG framework |
| `@astrojs/mdx` | latest | MDX support + Shiki integration |
| `shiki` | 1.x | Syntax highlighting (build + client) |
| `marked` | 12.x | Markdown parsing in the preview tool |

`marked` is particularly well-suited for the preview use case — it receives around 27 million npm downloads per week, supports CommonMark and GitHub Flavored Markdown, and its renderer override API makes Shiki integration straightforward.

## What to build next

A few natural extensions from this foundation:

1. **`<CodeBlock>` Astro component** — accepts `lang` and `filename` props, renders the header UI automatically so MDX authors don't write raw HTML wrappers
2. **Derived `authorInitials`** in the layout rather than as a frontmatter field
3. **Reading progress indicator** on article pages — a thin bar at the top of the viewport
4. **OG image generation** using `@astrojs/og` for social sharing previews driven from frontmatter

The template, Astro config, layout, CSS, and preview tool are all available as individual files. Start with the HTML template to get a feel for the design, then migrate piece by piece into your Astro project.
