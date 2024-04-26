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
        'postgresql/destination-database',
      ],
    },
    {
      type: 'category',
      label: 'ORMs',
      collapsed: false,
      items: [
        'orms/prisma',
        'orms/typeorm',
        'orms/rails',
      ],
    },
    'alternatives',
    'self-hosting',
    'changelog',
  ],
};

export default sidebars;
