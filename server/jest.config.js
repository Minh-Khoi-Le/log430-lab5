export default {
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // The root directory that Jest should scan for tests and modules within
  rootDir: './',
  
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // Indicates whether the coverage information should be collected
  collectCoverage: false,
  
  // The maximum amount of workers used to run your tests
  maxWorkers: 1,
  
  // An array of regexp pattern strings that are matched against all test paths
  // matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Indicates whether each individual test should be reported during the run
  // This option allows the use of a custom results processor
  // testResultsProcessor: undefined,
  
  // A map from regular expressions to paths to transformers
  transform: null,
  
  // Sets the test timeout in milliseconds
  testTimeout: 10000,
  
  // Indicates that we're using ES modules
  transform: null,
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['./tests/setup.js'],
  
  // Explicitly disable watch mode
  watch: false,
  watchAll: false,
  watchman: false,
  
  // Force Jest to exit after tests complete
  forceExit: true,
}; 
