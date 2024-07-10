const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { DefinePlugin } = require("webpack");

module.exports = {
  mode: "development",
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', ".json"],
    alias: {
      "@": path.resolve(__dirname, "./core"),
    },
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
