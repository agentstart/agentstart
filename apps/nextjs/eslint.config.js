import baseConfig, { restrictEnvAccess } from "@agent-stack/eslint-config/base";
import nextjsConfig from "@agent-stack/eslint-config/nextjs";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**", ".source/**"],
  },
  ...baseConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
