import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // TypeScript's own checks already cover undefined-symbol errors more
      // accurately than ESLint's JS-only no-undef (which does not
      // understand ambient TS types), and typescript-eslint's docs
      // recommend disabling it for this reason.
      "no-undef": "off",
    },
  },
  {
    // Test doubles for Fastify (fake `fastify.get`, bare `{ query, params }`
    // request stubs, etc.) intentionally don't implement the real
    // FastifyInstance/FastifyRequest/FastifyReply interfaces, so `any` is
    // the honest type there rather than a smell. Scoped to tests only;
    // production route/service code still has to be precisely typed.
    files: ["**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
