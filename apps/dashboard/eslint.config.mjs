import { createRequire } from "module";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const require = createRequire(import.meta.url);
const reactVersion = require("react/package.json").version;

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
    // .getFilename is not a function". Supplying the version explicitly
    // skips that code path entirely. It is resolved from the installed
    // react package rather than hardcoded, so a version bump inside the
    // "^19.0.0" range cannot silently leave this describing a react that
    // is no longer installed.
    settings: {
      react: {
        version: reactVersion,
      },
    },
  },
];

export default config;
