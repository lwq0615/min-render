const airbnbConfig = require('eslint-config-airbnb'); // Airbnb 基础配置
const airbnbHooksConfig = require('eslint-config-airbnb/hooks'); // React Hooks 支持
const { FlatCompat } = require('@eslint/eslintrc'); // 用于兼容传统配置

const compat = new FlatCompat({
  baseDirectory: __dirname, // 当前目录为基准路径
});

module.exports = [
  {
    ignores: ['dist', '.history'],
  },
  // 继承 Airbnb 配置
  ...compat.config(airbnbConfig),
  ...compat.config(airbnbHooksConfig),
];
