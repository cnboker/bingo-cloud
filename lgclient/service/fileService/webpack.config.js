const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: "inline-source-map",
  target: 'node',
  entry: './index.js',
  optimization: {
    minimize: false
  },
  node: {
    global: false,
    __filename: false,
    __dirname: false,
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist')
  },
  externals: {
    //必须这样写， 这样写编译后的代码为
    //module.exports = require("webos-service");
    //否则变成
    //module.exports = webos-service
    //导致错误
    'webos-service': 'require("webos-service")' 
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: "package.json",
          to: ""
        }, {
          from: "services.json",
          to: ""
        }
      ]
    })
  ]
};