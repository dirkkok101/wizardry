module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/polyfills.ts'
  ],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@services/(.*)$': '<rootDir>/src/app/services/$1',
    '^@models/(.*)$': '<rootDir>/src/app/types/$1',
    '^@scenes/(.*)$': '<rootDir>/src/app/scenes/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@utils/(.*)$': '<rootDir>/src/app/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/app/config/$1',
    '^@validation/(.*)$': '<rootDir>/src/app/validation/$1',
    '^@testing/(.*)$': '<rootDir>/src/app/testing/$1',
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
    '^@rendering/(.*)$': '<rootDir>/src/app/rendering/$1',
    '^@data/(.*)$': '<rootDir>/data/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|uuid)'
  ],
  transform: {
    '^.+\\.(ts|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$'
      }
    ]
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ]
};
