import { config } from 'dotenv';
import { getNeo4jDriver } from '../database/connections';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Ensure database connection is available
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Test connection
    await session.run('RETURN 1 as test');
    console.log('✅ Database connection established for tests');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  } finally {
    await session.close();
  }
});

afterAll(async () => {
  // Clean up connections
  const driver = getNeo4jDriver();
  await driver.close();
});

// Test helpers
export const testTimeout = 30000;

export const createTestId = (): string => {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const cleanupTestData = async (testIds: string[]): Promise<void> => {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Delete all test nodes and relationships
    await session.run(
      'MATCH (n) WHERE n.id IN $testIds DETACH DELETE n',
      { testIds }
    );
  } finally {
    await session.close();
  }
};