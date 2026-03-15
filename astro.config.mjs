// @ts-check
import { defineConfig } from "astro/config";
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
              { name: "created_at", widget: "hidden", picker_utc: false, required: false, default: "{{now}}", readonly: true, preview: false },
              { name: "updated_at", widget: "hidden", picker_utc: false, required: false, readonly: true, preview: false },
              { name: "author", widget: "hidden", default: "(you)", required: false, readonly: true, preview: false },
              { label: "Feature Image", name: "thumbnail", widget: "image" },
              { label: "Body", name: "body", widget: "markdown" },
            ],
          },
        ],
      },
    }),
  ],
});
