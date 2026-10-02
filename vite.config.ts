import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), react()],
  resolve: { tsconfigPaths: true },
  optimizeDeps: { include: ["@secondts/bark/web"] },
  server: { port: 3100, strictPort: true },
  lint: {
    options: { typeAware: true, typeCheck: true },
    plugins: ["typescript", "unicorn", "oxc", "import", "react", "jsx-a11y"],
    env: { browser: true, node: true },
    categories: {
      correctness: "error",
      suspicious: "error",
      pedantic: "error",
      perf: "error",
      style: "error",
      restriction: "error",
      nursery: "error",
    },
    ignorePatterns: ["src/routeTree.gen.ts", "dist/**", ".tanstack/**", "drizzle/**"],
    rules: {
      // Mutually exclusive export restrictions cannot coexist; framework files need named exports.
      "import/no-named-export": "off",
      "import/prefer-default-export": "off",
      "import/group-exports": "off",
      "import/exports-last": "off",
      // Effect uses namespace imports and capitalized service/schema constructors.
      "import/no-namespace": "off",
      "new-cap": ["error", { capIsNew: false }],
      "no-underscore-dangle": ["error", { allow: ["_tag"] }],
      // Oxfmt owns import order; object key order may carry meaning (e.g. Drizzle schema).
      "sort-imports": "off",
      "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
      "sort-keys": "off",
      "one-var": ["error", "never"],
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],
      "no-use-before-define": ["error", { functions: false }],
      // Modern TypeScript/React permits undefined, null, async, object spread, and conditional rendering.
      "no-undefined": "off",
      "unicorn/no-null": "off",
      "no-ternary": "off",
      "oxc/no-rest-spread-properties": "off",
      "oxc/no-async-await": "off",
      "oxc/no-optional-chaining": "off",
      "typescript/promise-function-async": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-no-literals": "off",
      // Tailwind/shadcn use className as their public styling API.
      "react/forbid-component-props": "off",
      "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
      "react/jsx-max-depth": "warn",
      "unicorn/max-nested-calls": "warn",
      "no-magic-numbers": ["error", { ignore: [0, 1], ignoreArrayIndexes: true }],
      "typescript/no-explicit-any": "error",
      "typescript/no-non-null-assertion": "error",
      "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-floating-promises": ["error", { ignoreVoid: false }],
      "typescript/no-misused-promises": "error",
      "typescript/consistent-type-imports": "error",
      "typescript/explicit-function-return-type": "error",
      "typescript/strict-boolean-expressions": "error",
      "typescript/switch-exhaustiveness-check": "error",
      "no-console": "error",
      "no-debugger": "error",
      "max-lines-per-function": "warn",
      "max-statements": "warn",
      "max-lines": "warn",
      "max-params": "warn",
      "complexity": "warn",
      "max-depth": "warn",
      "max-nested-callbacks": "warn",
    },
    overrides: [
      {
        files: ["**/*.test.ts", "**/*.test.tsx"],
        plugins: ["typescript", "unicorn", "oxc", "import", "react", "jsx-a11y", "vitest"],
        rules: {
          "max-lines-per-function": "off",
          "max-statements": "off",
          "max-lines": "off",
          "max-params": "off",
          "complexity": "off",
          "max-depth": "off",
          "max-nested-callbacks": "off",
          "unicorn/max-nested-calls": "off",
          // Tests import their APIs explicitly instead of relying on ambient globals.
          "vitest/no-importing-vitest-globals": "off",
          "no-magic-numbers": "off",
        },
      },
      {
        files: ["*.config.ts"],
        rules: {
          "import/no-default-export": "off",
          "import/no-nodejs-modules": "off",
        },
      },
      {
        files: ["src/routes/**/*.tsx"],
        rules: {
          // TanStack's generated route tree imports Route rather than React components.
          "react/only-export-components": "off",
        },
      },
      {
        files: ["**/*.tsx"],
        rules: {
          // React event and intrinsic props are mutable in the upstream declarations.
          "typescript/prefer-readonly-parameter-types": "off",
        },
      },
      {
        files: ["src/components/ui/**/*.tsx"],
        rules: {
          // Shadcn compound components forward intrinsic props and share a module.
          "react/no-multi-comp": "off",
          "react/jsx-props-no-spreading": "off",
          "react/only-export-components": ["error", { allowExportNames: ["buttonVariants"] }],
        },
      },
      {
        files: ["src/components/ui/label.tsx"],
        rules: {
          // The htmlFor/children props are forwarded; check the association at the call site.
          "jsx-a11y/label-has-associated-control": "off",
        },
      },
      {
        files: ["src/components/ui/field.tsx"],
        rules: {
          // Field is an accessible group; FieldSet is the separate fieldset primitive.
          "jsx-a11y/prefer-tag-over-role": "off",
        },
      },
      {
        files: ["src/server/**/*.ts"],
        rules: { "import/no-nodejs-modules": "off" },
      },
    ],
  },
  fmt: {
    printWidth: 120,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    jsxSingleQuote: false,
    quoteProps: "consistent",
    trailingComma: "all",
    arrowParens: "always",
    bracketSpacing: true,
    endOfLine: "lf",
    insertFinalNewline: true,
    sortImports: { internalPattern: ["@/**"] },
    sortTailwindcss: { stylesheet: "./src/styles.css", functions: ["cn", "cva"] },
    sortPackageJson: { sortScripts: true },
    ignorePatterns: [
      "src/routeTree.gen.ts",
      "dist/**",
      ".tanstack/**",
      "drizzle/**",
      "pnpm-lock.yaml",
      ".agents/**",
      ".opencode/**",
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
