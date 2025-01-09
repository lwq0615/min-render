const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./core/index.ts",
  devtool: false,
  experiments: {
    outputModule: process.env.type === 'module'
  },
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: `core.${process.env.type}.js`,
    library: {
      type: process.env.type
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', ".json"]
  },
  module: {
    rules: [
      {
        test: /[\.tsx?|\.jsx?|\.ts?|\.js?]$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
  plugins: [
    process.env.type === 'commonjs' && new CleanWebpackPlugin(),
  ]
};
