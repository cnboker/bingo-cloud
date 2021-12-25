const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const { env } = process;

const options = {
  mode: env.NODE_ENV,
  entry: "./src/index.js",
  output: {
    filename: "[name].js",
  },
  module: {
    rules: [
      { test: /\.(js|jsx)$/, loader: "babel-loader", exclude: /node_modules/ },
      { test: /\.tsx$/, loader: "ts-loader" },
    ],
  },
  resolve: {
    extensions: ["*", ".js", ".jsx", ".tsx"],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV),
    }),
    new HtmlWebpackPlugin(),
  ],

  devServer: {
    hot: true,
  },
  devtool:
    env.NODE_ENV === "development" ? "eval-cheap-module-source-map" : undefined,
};

module.exports = options;
