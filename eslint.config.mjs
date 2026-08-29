import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default [
  { ignores:[".next/**",".next-buyflow/**",".next-buyflow-runtime/**",".next-buyflow-build/**",".next-buyflow-dev-v2/**",".next-buyflow-build-v2/**","node_modules/**","prisma/dev.db","tsconfig.tsbuildinfo","next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules:{"@typescript-eslint/no-explicit-any":"off","@typescript-eslint/no-unused-vars":"off"} }
];
