import Joi from 'joi';

const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().port().default(3000),
    // Not yet required: database, auth and payment integrations land in later tasks.
    DATABASE_URL: Joi.string().uri().optional(),
}).unknown(true);

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
        throw new Error(`Environment validation error: ${error.message}`);
    }
    return value as Record<string, unknown>;
}
