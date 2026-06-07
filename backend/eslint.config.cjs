module.exports = [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'uploads/**', 'coverage/**', 'dist/**', 'build/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs'
    },
    rules: {}
  }
];

