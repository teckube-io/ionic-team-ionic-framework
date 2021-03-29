module.exports = {
  preset: "@vue/cli-plugin-unit-jest/presets/typescript-and-babel",
  transform: {
    "^.+\\.vue$": "vue-jest"
  },
  setupFiles: ['<rootDir>/tests/unit/setupTests.ts'],
  transformIgnorePatterns: ["node_modules/(?!@ionic/vue)"],
  globals: {
    "ts-jest": {
      diagnostics: {
        warnOnly: true
      }
    }
  }
};
