// @ts-ignore: ts(2305) -- somehow TS lint mark this line as error
import { defineCollection, z } from "astro:content";

import { sveltiaLoader } from "astro-loader-sveltia-cms/loader";

// Collections are defined in astro.config.mjs.
// Just reference them by name here, schema is auto-generated.
const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  loader: sveltiaLoader("posts"),
});

export const collections = { posts };
