// @ts-check
import { defineConfig } from "astro/config";
import { transformerNotationDiff, transformerNotationHighlight } from '@shikijs/transformers';
import { transformerCopyButton } from '@selemondev/shiki-transformer-copy-button'

import sveltia from "astro-loader-sveltia-cms";
import { remarkFileInfo } from './src/plugins/file_timestamp.mjs';

// https://astro.build/config
export default defineConfig({
  base: '/blog',
  outDir: 'public',
  publicDir: 'src/static',
  image: {
    responsiveStyles: true,
    // service: {
    //   entrypoint: 'astro/assets/services/squoosh', // Or 'sharp', make sure the correct package is installed
    // },
    // Set default layout for all images, including those in Markdown
    layout: 'constrained',
  },
  markdown: {
    remarkPlugins: [remarkFileInfo],
    shikiConfig: {
      theme: 'material-theme',
      wrap: false,
      langs: [],
      transformers: [
        transformerNotationDiff({ matchAlgorithm: 'v3' }),
        transformerNotationHighlight({ matchAlgorithm: 'v3' }),
        transformerCopyButton({
          duration: 2000,
          display: 'ready',
          successIcon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='rgba(128,128,128,1)' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24'%3E%3Crect width='8' height='4' x='8' y='2' rx='1' ry='1'/%3E%3Cpath d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/%3E%3Cpath d='m9 14 2 2 4-4'/%3E%3C/svg%3E`,
          copyIcon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='rgba(128,128,128,1)' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24'%3E%3Crect width='8' height='4' x='8' y='2' rx='1' ry='1'/%3E%3Cpath d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/%3E%3Cpath d='m8 10 8 0 M 8 14h 8 M 8 18 h8'/%3E%3C/svg%3E`,
        }),
      ],
    }
  },
  integrations: [
    sveltia({
      // Find docs here https://sveltiacms.app/llms.txt
      route: "/cms",
      title: "My Custom CMS",
      config: {
        backend: {
          name: "github",
          repo: "Channnnnn/git-cms",
          branch: "master",
        },

        media_folder: "media",

        collections: [
          {
            name: "posts",
            label: "Posts",
            folder: "blog", // /blog
            create: true,
            sortable_fields: ["title", "created_at", "updated_at"],
            preview_path: "blog/{{slug}}/",
            preview_path_date_field: "created_at",
            fields: [
              { label: "Title", name: "title", widget: "string" },
              { label: "Mark as Draft", name: "draft", widget: "boolean", required: false, comment: "Set to draft will hide/unpublish the post" },
              { name: "author", widget: "hidden", default: "(you)", required: false, readonly: true, preview: false },
              { label: "Topic", name: "category", widget: "string" },
              { label: "Feature Image", name: "thumbnail", widget: "image", required: false },
              { label: "Body", name: "body", widget: "markdown" },
            ],
          },
        ],
      },
    }),
  ],
});
