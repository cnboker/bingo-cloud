# react+typescript+webpack Boilerplate

This boilerplate could help you start to play react with Hot reload

## Getting Started

Create a new directory then

``` bash
    npm init -y
```

## Dependencies

### Install dependencies

``` bash

npm install react@latest react-dom@latest react-hot-loader

```

### Install development dependenices

Babel

```bash
npm install webpack webpack-cli web-dev-server html-webpack-plugin --save-dev
```

ESLint Airbnb

```bash
npx install-peerdeps --dev eslint-config-airbnb
npx install babel-eslint --save-dev

```

Cross-env

```bash
npm install cross-env -save-dev
```

### Setup

create .babelrc.json

``` json
{
    "presets":[
        "@babel/preset-env",
        "@babel/preset-react"
    ],
    "plugins":[
        "react-hot-loader/babel"
    ]
}
```

create .eslintrc.json

```json
{
  "parser": "babel-eslint",
  "extends": ["airbnb"],
  "env": {
    "browser": true
  },
  "rules": {
    "arrow-parens": "off",
    "comma-dangle": ["error", "never"],
    "no-confusing-arrow": "off",
    "no-unused-expressions": "off",
    "react/jsx-filename-extension": [1, { "extensions": [".js", ".jsx"] }],
    "react/jsx-one-expression-per-line": "off"
  },
  "plugins": [
    "react"
  ]
}
```

webpack.config.js

``` javascript
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { env } = process;
const path = require('path');
const options = {
  mode: env.NODE_ENV,
  entry: "./index.js",
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  module: {
    rules: [
      { test: /\.(js|jsx)$/, loader: "babel-loader", exclude: /node_modules/ },
      //To allow Webpack to load Typescript files, Let's add support for the .ts and tsx extensions
      { test: /\.(tsx|ts)$/, loader: "ts-loader", exclude: /node_modules/, },
    ],
  },
  resolve: {
    extensions: ["*", ".js", ".jsx", ".tsx", ".ts"],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV),
    }),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin()
  ],

  devServer: {
    hot: true,
  },
  devtool:
    env.NODE_ENV === "development" ? "source-map" : undefined,
};

module.exports = options;

```

package.json

``` json
#script section explain
"scripts": {
    "clean": "rimraf dist",
    //启动example做扩张程序
    "start": "cross-env NODE_ENV=development webpack-dev-server --hot",
    "build": "cross-env NODE_ENV=development webpack",
    //生成库文件为第三方程序引用
    "pub": "npm run clean && tsc -p .",
    "lint": "eslint ./src"
  },
```

### Installing typescript

```bash
npm install --save-dev @types/react @types/react-dom
```

create tsconfig.json file like so:

```json
    {
        "complierOptions":{
            //generate .d.ts filest
            "declaration":true,
            "strict":true,
            "moduleResolution":"node",
            "rootDir":"./src",
            "sourceMap":true,
            "jsx":"react",
            "target":"ES6",
            "noResolve": false,
            "noImplicitAny": false,
            "removeComments": true,
            "outDir": "dist",
            // interop between ESM and CJS modules. Recommended by TS
            "esModuleInterop": true,
            "importHelpers": true,
            // significant perf increase by skipping checking .d.ts files, particularly those in node_modules. Recommended by TS
            "skipLibCheck": true,
            // `tsdx build` ignores this option, but it is commonly used when type-checking separately with `tsc`
            // "noEmit": true,
            "skipDefaultLibCheck": true,
            "strictNullChecks": false
        }
    }
```

* How/where to download your program
* Any modifications needed to be made to files/folders

### Executing program

* lib test
  
```bash
npm start
```

* lib publish

``` bash
npm run pub
```
