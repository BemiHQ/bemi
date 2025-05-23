import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Bemi",
  tagline: "Automatic database change tracking",
  favicon: "img/favicon.ico",
  url: "https://docs.bemi.io",
  baseUrl: "/",
  organizationName: "BemiHQ",
  projectName: "bemi",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  clientModules: [
    './src/js/clientModule.js',
  ],

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        language: ["en"],
        docsRouteBasePath: '/',
      },
    ],
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/BemiHQ/bemi/tree/main/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    metadata: [
      {name: 'title', content: 'Bemi Docs - Automatic Audit Trail as a Service for PostgreSQL'},
      {name: 'description', content: 'Bemi: Your automatic, reliable audit trail for PostgreSQL. Securely connect to your databases, enrich data changes, and maintain an immutable record of data modifications with military-grade encryption. Perfect for troubleshooting, reporting, data recovery, and audit purposes'},
      {name: 'keywords', content: 'Bemi, PostgreSQL audit trail, database tracking, data compliance, PostgreSQL data changes, automated audit, change data capture, data observability, pgaudit'},
      {name: 'image', content: 'img/social-card.png'},
    ],
    image: "img/social-card.png",
    navbar: {
      title: "Bemi",
      logo: {
        alt: "Bemi Logo",
        src: "img/logo.png",
      },
      items: [
        {
          href: "https://github.com/BemiHQ/bemi",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Bemi",
          items: [
            {
              label: "Homepage",
              href: "https://bemi.io",
            },
            {
              label: "Blog",
              href: "https://bemi.io/blog",
            },
            {
              label: "Contact us",
              href: "https://bemi.io/contact-us",
            },
          ],
        },
        {
          title: "Bemi packages",
          items: [
            {
              label: "Prisma",
              href: "https://github.com/BemiHQ/bemi-prisma",
            },
            {
              label: "Ruby on Rails",
              href: "https://github.com/BemiHQ/bemi-rails",
            },
            {
              label: "TypeORM",
              href: "https://github.com/BemiHQ/bemi-typeorm",
            },
            {
              label: "SQLAlchemy",
              href: "https://github.com/BemiHQ/bemi-sqlalchemy",
            },
            {
              label: "Supabase JS",
              href: "https://github.com/BemiHQ/bemi-supabase-js",
            },
            {
              label: "MikroORM",
              href: "https://github.com/BemiHQ/bemi-mikro-orm",
            },
            {
              label: "Django",
              href: "https://github.com/BemiHQ/bemi-django",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/BemiHQ/bemi",
            },
            {
              label: "Discord",
              href: "https://discord.gg/mXeZ6w2tGf",
            },
          ],
        },
        {
          title: "Socials",
          items: [
            {
              label: "LinkedIn",
              href: "https://www.linkedin.com/company/bemihq/about",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/BemiHQ",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Bemi`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['ruby'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
