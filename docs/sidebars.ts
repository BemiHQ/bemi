import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  bemiSidebar: [
    'home',
    'faq',
    {
      type: 'category',
      label: 'PostgreSQL',
      collapsed: false,
      items: [
        'postgresql/source-database',
        {
          type: 'category',
          label: 'Hosting Platforms',
          collapsed: true,
          items: [
            'hosting/supabase',
            'hosting/neon',
            'hosting/aws',
            'hosting/gcp',
            'hosting/render',
            'hosting/digitalocean',
            'hosting/self-managed',
          ],
        },
        'postgresql/destination-database',
      ],
    },
    {
      type: 'category',
      label: 'ORMs',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'JavaScript/TypeScript',
          collapsed: true,
          items: [
            'orms/prisma',
            'orms/typeorm',
            'orms/supabase-js',
            'orms/mikro-orm',
          ],
        },
        {
          type: 'category',
          label: 'Ruby',
          collapsed: true,
          items: [
            'orms/rails',
          ],
        },
        {
          type: 'category',
          label: 'Python',
          collapsed: true,
          items: [
            'orms/sqlalchemy',
          ],
        },
      ],
    },
    'alternatives',
    'self-hosting',
    'changelog',
  ],
};

export default sidebars;
