// Separate from the default Jest config in package.json (which only runs apps/api/src/**/*.spec.ts
// unit tests with no database). These tests need a real, migrated Postgres test database - run
// via `npm run test:integration -w apps/api`, never as part of the default `test` script.
// See docs/07-operations/DEVELOPMENT-SETUP.md for the required setup sequence.
module.exports = {
    extensionsToTreatAsEsm: ['.ts'],
    moduleFileExtensions: ['js', 'json', 'ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        // @nestjs/throttler crashes Jest's --experimental-vm-modules worker on import (see
        // test/mocks/throttler.mock.ts for why) - mapped to a no-op mock here rather than
        // excluded ad hoc from every test file that happens to load code importing it.
        '^@nestjs/throttler$': '<rootDir>/mocks/throttler.mock.ts',
    },
    rootDir: 'test',
    testRegex: '.*\\.integration-spec\\.ts$',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: '<rootDir>/tsconfig.json',
            },
        ],
    },
    testEnvironment: 'node',
    testTimeout: 30000,
};
