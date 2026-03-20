---
title: "The Craft of Writing Software in the Open"
thumbnail: https://preview.redd.it/opensource-tools-be-like-v0-qnkbvzka0lnb1.jpg?width=640&crop=smart&auto=webp&s=6e4a4f2528312879aba8cdfbf3a799843c690a4b
category: "Technology"
tags: ["Writing", "Tooling", "Documentation"]
---

There is a particular kind of writing that most programmers do every day without thinking of it as writing at all. Comments, commit messages, README files, pull request descriptions — these are not incidental to software. They *are* the software, in the sense that software without them is a locked room with no door.

The best open-source projects are also, quietly, the best-written ones.

## Why clarity is a technical virtue

When a codebase is hard to read, the instinct is to blame the language or the complexity of the domain. Rarely do we blame the writing. But the two are inseparable. A function named `process` tells you nothing. A function named `normalizePostSlug` tells you exactly what it does and where it belongs.

> Good naming is not a cosmetic choice — it is the primary documentation of intent. When you rename a function, you are not changing what the computer does; you are changing what the human understands.

This is why code review comments like *"this is confusing"* are valid technical feedback, not stylistic preferences.

## A brief taxonomy of developer writing

Every software project involves at least four kinds of writing, each with its own conventions:

1. **Inline comments** — explain *why*, not *what*. The code already says what it does.
2. **Docstrings / JSDoc** — describe the contract: inputs, outputs, side effects, exceptions.
3. **README and guides** — orient the newcomer. Assume nothing about prior knowledge.
4. **Commit messages** — a permanent record of intent. Future you will read these.

Each one fails in a different way when written carelessly, and each one compounds into either trust or confusion over the life of a project.

## What good README files do

A README is not a manual. It is an invitation.

The best ones answer four questions in the first screen of text:

- What does this do?
- Who is it for?
- How do I start?
- Where do I go for more?

Everything else — API references, architecture diagrams, contributing guides — belongs elsewhere, linked to but not embedded. The sin of most READMEs is length masquerading as thoroughness.

---

## Code as writing: a few examples

Here is a common pattern — the kind of comment that says nothing:

```javascript
// loop through items
for (const item of items) {
  process(item);
}
```

Compare it to this:

```javascript
// Normalize each post's slug before writing to the content index.
// Slugs from Sveltia CMS may contain uppercase or trailing slashes.
for (const post of posts) {
  post.slug = normalizePostSlug(post.slug);
}
```

The second version tells you the *why*, the *where*, and the *what to watch for* — in two lines of prose.

### Typed signatures as documentation

TypeScript and JSDoc annotations are a form of writing too. A well-typed function signature is a complete sentence:

```typescript
/**
 * Converts a raw CMS post slug into a URL-safe, lowercase identifier.
 * Strips leading/trailing slashes and replaces spaces with hyphens.
 */
function normalizePostSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/^\/|\/$/g, '')
    .replace(/\s+/g, '-');
}
```

No inline documentation needed. The types, the name, and the JSDoc comment form a complete picture.

### Configuration files

Even config deserves care. Compare these two `astro.config.mjs` snippets:

```js
// ❌ No context
export default defineConfig({
  markdown: { shikiConfig: { theme: 'github-light', wrap: false } }
});
```

```js
// ✅ Intent is clear
export default defineConfig({
  markdown: {
    shikiConfig: {
      // Warm light-gray theme — matches the blog palette.
      // Set wrap: true if you want long lines to soft-wrap instead of scroll.
      theme: 'github-light',
      wrap: false,
    },
  },
});
```

Same output. Very different reading experience six months later.

---

## A note on markdown itself

There is something fitting about the fact that so much developer writing happens in Markdown. The format enforces a kind of discipline: no fonts, no colors, no layout tricks. The writing has to work on its own terms.

Markdown supports a useful subset of formatting:

| Element | Syntax | Use for |
|---|---|---|
| Heading | `## Title` | Section breaks |
| Bold | `**text**` | Key terms, warnings |
| Italic | `*text*` | Titles, emphasis |
| Inline code | `` `code` `` | Variable names, paths |
| Blockquote | `> text` | Citations, callouts |
| Link | `[label](url)` | References |

Nothing more is needed for most technical writing. The constraint is a feature.

## Closing thought

The programmer who writes well has a compounding advantage. Every README they write makes their project more approachable. Every commit message they write makes the git log more navigable. Every comment they write makes the next reader's job easier — and that next reader is usually themselves, six months later.

Software is a form of communication. The compiler is just one of the audiences.
