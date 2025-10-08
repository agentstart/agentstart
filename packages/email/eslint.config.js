import baseConfig, { restrictEnvAccess } from "@agent-stack/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".cache/**"],
  },
  ...baseConfig,
  ...restrictEnvAccess,
];
