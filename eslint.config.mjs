import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/services/**/*.ts"],
    ignores: ["src/services/apiClient.ts", "src/services/externalApiClient.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "ky",
              message:
                "Import ky only in src/services/apiClient.ts or src/services/externalApiClient.ts. Use apiClient for internal APIs and externalApiClient for external APIs.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/hook/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/app/api/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "ky",
              message:
                "Do not import ky in hooks or API routes. Use service-layer apiClient or externalApiClient wrappers.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
