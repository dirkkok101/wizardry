// Shared configuration used by all test projects
const sharedConfig = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
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
  }
};

module.exports = {
  // Use projects to split fast unit tests from slow integration/e2e tests
  // Run fast tests: npm run test:unit
  // Run slow tests: npm run test:integration
  // Run all tests:  npm test
  projects: [
    {
      ...sharedConfig,
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.spec.ts',
        '<rootDir>/src/**/*.spec.ts'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/e2e/',
        '\\.integration\\.spec\\.ts$',
        '\\.e2e\\.spec\\.ts$',
        '\\.performance\\.spec\\.ts$'
      ]
    },
    {
      ...sharedConfig,
      displayName: 'integration',
      testMatch: [
        '<rootDir>/src/**/*.integration.spec.ts',
        '<rootDir>/src/**/*.e2e.spec.ts',
        '<rootDir>/src/**/*.performance.spec.ts'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
      ]
    }
  ]
};
