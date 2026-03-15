// @ts-ignore: ts(2305) -- somehow TS lint mark this line as error
import { defineCollection } from "astro:content";

import { sveltiaLoader } from "astro-loader-sveltia-cms/loader";

// Collections are defined in astro.config.mjs.
// Just reference them by name here, schema is auto-generated.
const posts = defineCollection({
  loader: sveltiaLoader("posts"),
});

export const collections = { posts };
