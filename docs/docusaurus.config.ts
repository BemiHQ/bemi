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
              href: "mailto:hi@bemi.io",
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
              label: "TypeORM",
              href: "https://github.com/BemiHQ/bemi-typeorm",
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
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
