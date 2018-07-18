module.exports = {
  roots: ["<rootDir>/test", "<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "@app/(.*)$": "<rootDir>/src/$1",
  },
  setupTestFrameworkScriptFile: "<rootDir>/test/setup.ts",
};
