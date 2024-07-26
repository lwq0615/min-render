const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  mode: process.env.mode,
  entry: "./core/index.ts",
  devtool: false,
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "[name].js",
    library: {
      type: 'commonjs'
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', ".json"]
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
  ]
};
