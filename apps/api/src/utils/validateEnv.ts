import Joi from 'joi';
import { logger } from './logger';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_PORT: Joi.number().port().default(3001),

  // Neo4j configuration
  NEO4J_URI: Joi.string().uri().default('bolt://localhost:7687'),
  NEO4J_USER: Joi.string().default('neo4j'),
  NEO4J_PASSWORD: Joi.string().required(),

  // Redis configuration
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),

  // Authentication
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  GOOGLE_CLIENT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // CORS
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown();

export function validateEnv(): void {
  const { error, value } = envSchema.validate(process.env);

  if (error) {
    logger.error('Environment validation failed:', error.details);
    throw new Error(`Environment validation failed: ${error.details.map(d => d.message).join(', ')}`);
  }

  // Update process.env with validated values
  Object.assign(process.env, value);

  logger.info('Environment variables validated successfully');
}