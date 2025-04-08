const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { DefinePlugin } = require('webpack');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.tsx',
  devtool: false,
  output: {
    path: path.resolve(__dirname, './test'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /[.tsx?|.jsx?|.ts?|.js?]$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  stats: 'errors-only',
  plugins: [
    new CleanWebpackPlugin(),
    new DefinePlugin({}),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './public/index.html'),
      filename: 'index.html',
      title: 'jsx',
    }),
    new FriendlyErrorsWebpackPlugin(),
  ],
  devServer: {
    static: path.resolve(__dirname, './public'),
    port: 3000,
    open: true,
  },
};
