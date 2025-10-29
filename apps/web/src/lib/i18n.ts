import { defineI18n } from "fumadocs-core/i18n";

export const i18n = defineI18n({
  defaultLanguage: "en",
  fallbackLanguage: "cn",
  languages: ["en", "cn"],
  parser: "dot",
  hideLocale: "never",
});
