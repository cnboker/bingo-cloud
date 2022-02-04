//https://levelup.gitconnected.com/how-to-add-a-custom-eslint-configuration-to-a
//-create-react-app-project-aea3f7c1d7af
module.exports = {
  env: {
    browser: true, // Browser global variables like `window` etc.
    commonjs: true, // CommonJS global variables and CommonJS scoping.Allows require, exports and module.
    es6: true, // Enable all ECMAScript 6 features except for modules.
    jest: true, // Jest global variables like `it` etc.
    node: true, // Defines things like process.env when generating through node
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jest/recommended",
    "plugin:testing-library/react",
  ],
  parser: "babel-eslint", // Uses babel-eslint transforms.
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: "module", // Allows for the use of imports
  },
  plugins: [
    "import", // eslint-plugin-import plugin. https://www.npmjs.com/package/eslint-plugin-import
  ],
  root: true, // For configuration cascading.
  rules: {
    "comma-dangle": [2, "always-multiline"],
    "eol-last": "error",

    indent: "off",
    "jsx-quotes": ["warn", "prefer-double"],
    "max-len": [
      "warn",
      {
        code: 120,
      },
    ],
    "no-console": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "no-duplicate-imports": "warn",
    "no-unused-vars": "warn",
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "off",
    "key-spacing": ["error", { beforeColon: false, afterColon: true }],
    "react/jsx-curly-spacing": [
      "warn",
      {
        when: "never",
        children: {
          when: "always",
        },
      },
    ],
    "react/jsx-filename-extension": [
      "error",
      {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    ],
    "react/jsx-indent": "off",
    //"react/jsx-indent-props": ["error", 4],
    semi: "warn",
    "sort-imports": [
      "warn",
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
      },
    ],
    // "sort-keys": [     "warn",     "asc",     {         caseSensitive: true,
    //    minKeys: 2,         natural: false     } ]
  },
  settings: {
    react: {
      version: "detect", // Detect react version
    },
  },
  overrides: [
    {
      files: ["**/*.ts?(x)"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2018,
        sourceType: "module",
      },
      plugins: ["@typescript-eslint"],
      // You can add Typescript specific rules here. If you are adding the typescript
      // variant of a rule which is there in the javascript ruleset, disable the JS
      // one.
      rules: {
        "@typescript-eslint/no-array-constructor": "warn",
        "no-array-constructor": "off",
      },
    },
  ],
};
