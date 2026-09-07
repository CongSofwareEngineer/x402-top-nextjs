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
  ]),
  {
     rules: {
      "jsx-a11y/label-has-associated-control": "off",
      "no-console": "warn",
      "react/prop-types": "off",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "prettier/prettier": "warn",
      "no-unused-vars": "off",
      "unused-imports/no-unused-vars": "off",
      "jsx-a11y/iframe-has-title": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          ignoreRestSiblings: false,
          argsIgnorePattern: "^_.*?$",
        },
      ],

      "import/order": [
        "warn",
        {
          groups: [
            "type",
            "builtin",
            "object",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],

          pathGroups: [
            {
              pattern: "~/**",
              group: "external",
              position: "after",
            },
          ],

          "newlines-between": "always",
        },
      ],

      "react/self-closing-comp": "warn",

      // "react/jsx-sort-props": [
      //   "warn",
      //   {
      //     callbacksLast: true,
      //     shorthandFirst: true,
      //     noSortAlphabetically: false,
      //     reservedFirst: true,
      //   },
      // ],

      "padding-line-between-statements": [
        "warn",
        {
          blankLine: "always",
          prev: "*",
          next: "return",
        },
        {
          blankLine: "always",
          prev: ["const", "let", "var"],
          next: "*",
        },
        {
          blankLine: "any",
          prev: ["const", "let", "var"],
          next: ["const", "let", "var"],
        },
      ],
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "prettier/prettier": [
        "warn",
        {
          "endOfLine": "lf",
          printWidth: 150,
          semi: false,
          singleQuote: true, // 👈 BẮT BUỘC: dùng nháy đơn
          jsxSingleQuote: true, // 👈 Áp dụng luôn trong JSX
          trailingComma: "es5",
          jsxBracketSameLine: false,
          proseWrap: "always",
          endOfLine: "lf", // 👈 Sửa lỗi dòng xuống ␍
        },
      ],
    },
  }
]);

export default eslintConfig;
