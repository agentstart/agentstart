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
