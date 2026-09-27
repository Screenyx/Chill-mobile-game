/** Tests de la logique de jeu (TypeScript pur, sans React Native). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { isolatedModules: true, esModuleInterop: true, rootDir: '.' } }] },
};
