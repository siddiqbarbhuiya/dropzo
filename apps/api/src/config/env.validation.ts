import Joi from 'joi';

const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().port().default(3000),
    // Required since BC-004 - every environment (dev, test, CI, production) needs a real
    // Postgres connection string. Auth and payment integrations remain later tasks.
    DATABASE_URL: Joi.string()
        .uri({ scheme: ['postgresql', 'postgres'] })
        .required(),
    // Optional: the restricted runtime role PrismaService connects as - see its constructor.
    // Falls back to DATABASE_URL when unset, so this is not required.
    APP_DATABASE_URL: Joi.string()
        .uri({ scheme: ['postgresql', 'postgres'] })
        .optional(),
}).unknown(true);

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
        throw new Error(`Environment validation error: ${error.message}`);
    }
    return value as Record<string, unknown>;
}
