const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { DefinePlugin } = require("webpack");

module.exports = {
  mode: process.env.mode,
  entry: "./src/index.tsx",
  devtool: process.env.mode === 'development' ? 'source-map' : false,
  output: {
    path: path.resolve(__dirname, "./test"),
    filename: "[name].js",
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', ".json"]
  },
  module: {
    rules: [
      {
        test: /[\.tsx?|\.jsx?]$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new DefinePlugin({}),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "./public/index.html"),
      filename: "index.html",
      title: "jsx"
    }),
  ],
  devServer: {
    static: path.resolve(__dirname, "./public"),
    port: 3000,
  },
};
