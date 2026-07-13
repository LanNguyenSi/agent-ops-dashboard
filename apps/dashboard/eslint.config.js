import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next@16.2.6 ships a native flat-config array (verified via
// its package.json "exports" and dist/core-web-vitals.js), so we consume it
// directly instead of routing through @eslint/eslintrc's FlatCompat shim.
// The old `compat.extends("next/core-web-vitals")` path crashed under
// ESLint 10 (a circular structure inside the eslintrc config validator's
// error formatting), which is why CI had this step reduced to an echo
// placeholder. That crash is a FlatCompat/ESLint-10 interaction, not a real
// eslint-config-next incompatibility, so switching to the native export
// resolves it without waiting on any upstream fix.
const config = [
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/dist/**",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    // eslint-config-next's base config sets settings.react.version to
    // "detect", which makes eslint-plugin-react@7.37.5 call
    // context.getFilename() to locate the nearest package.json. ESLint 10
    // dropped that deprecated context method (context.filename replaces
    // it), so "detect" crashes every lint run with "contextOrFilename
    // .getFilename is not a function". Pinning the version explicitly
    // skips that code path entirely. Keep in sync with the installed
    // "react" dependency version.
    settings: {
      react: {
        version: "19.2.6",
      },
    },
  },
];

export default config;
