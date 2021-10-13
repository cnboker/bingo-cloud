var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const nodeExternals = require('webpack-node-externals');

module.exports = {
    target:'web',
    externals: [nodeExternals()],
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index_bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.(js)$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            }, {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    mode: 'development',
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: "./appinfo.json",
                    to: "./"
                }, {
                    from: "./icon.png",
                    to: "./"
                }
            ]
        }),
        new HtmlWebpackPlugin({template: 'index.html'})
    ]
}