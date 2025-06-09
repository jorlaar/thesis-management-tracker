module.exports = {
  testEnvironment: 'node',
  testTimeout: 100000,
  verbose: false,
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  testPathIgnorePatterns: ['__tests__/mocks/', '__tests__/server.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@app/common(.*)$': '<rootDir>/src/common$1',
    '^@app/data(.*)$': '<rootDir>/src/data$1',
    '^@app/server(.*)$': '<rootDir>/src/server$1',
    '^@app(.*)$': '<rootDir>/src$1',
  },
};
