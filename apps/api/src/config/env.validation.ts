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

    // Required since BC-005 - see docs/04-design/AUTHENTICATION-DESIGN.md. Never defaulted: a
    // predictable signing/hashing secret would defeat the point of having one.
    JWT_ACCESS_SECRET: Joi.string().min(32).required(),
    OTP_HASH_SECRET: Joi.string().min(32).required(),

    ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().positive().default(30),

    OTP_CODE_LENGTH: Joi.number().integer().min(4).max(10).default(6),
    OTP_EXPIRY_SECONDS: Joi.number().integer().positive().default(300),
    OTP_MAX_ATTEMPTS: Joi.number().integer().positive().default(5),
    OTP_RESEND_COOLDOWN_SECONDS: Joi.number().integer().min(0).default(30),
    OTP_PER_PHONE_HOURLY_LIMIT: Joi.number().integer().positive().default(5),
    OTP_PER_IP_HOURLY_LIMIT: Joi.number().integer().positive().default(20),
    // 'dev' (default) logs the code to the server console and never sends a real SMS - see
    // src/auth/otp/providers/dev-otp.provider.ts. A real provider name is registered only once a
    // vendor is actually chosen and configured; this is validated at the factory, not here, so
    // adding one doesn't require touching this schema.
    OTP_PROVIDER: Joi.string().default('dev'),
}).unknown(true);

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
        throw new Error(`Environment validation error: ${error.message}`);
    }
    return value as Record<string, unknown>;
}
