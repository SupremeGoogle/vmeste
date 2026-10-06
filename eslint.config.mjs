import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local agent assets and scratch files are not application source.
    ".agents/**",
    ".claude/**",
    "tmp/**",
    "output/**",
    "brag-output/**",
    // Промо-ролики (в git не входят) со сторонними библиотеками внутри.
    "videos/**",
  ]),
]);

export default eslintConfig;
