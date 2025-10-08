/* agent-frontmatter:start
AGENT: Prettier configuration for code formatting
PURPOSE: Consistent code formatting across monorepo
FEATURES:
  - Semicolons required
  - Double quotes for strings
  - Tailwind CSS class sorting
USAGE: Extended by all packages
SEARCHABLE: prettier config, code formatting, style guide
agent-frontmatter:end */

/** @typedef {import("prettier").Config} PrettierConfig */
/** @type { PrettierConfig } */
const config = {
  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  overrides: [
    {
      files: "*.json.hbs",
      options: {
        parser: "json",
      },
    },
    {
      files: "*.js.hbs",
      options: {
        parser: "babel",
      },
    },
  ],
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
