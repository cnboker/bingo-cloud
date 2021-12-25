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
  },
  module: {
    rules: [
      { test: /\.(js|jsx)$/, loader: "babel-loader", exclude: /node_modules/ },
      { test: /\.(tsx|ts)$/, loader: "ts-loader", exclude: /node_modules/, },
    ],
  },
  resolve: {
    extensions: ["*", ".js", ".jsx", ".tsx", ".ts"],
  },
  plugins: [
    // new webpack.DefinePlugin({
    //   "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV),
    // }),
    new CleanWebpackPlugin(),
  ],

  devServer: {
    hot: true,
  },
  devtool:
    env.NODE_ENV === "development" ? "source-map" : undefined,
};

module.exports = options;
