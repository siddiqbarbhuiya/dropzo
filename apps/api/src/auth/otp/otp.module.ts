import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DevOtpProvider } from './providers/dev-otp.provider.js';
import { OTP_PROVIDER } from './otp.constants.js';
import { OtpService } from './otp.service.js';

/**
 * Selects the configured OTP provider. Hard guard: OTP_PROVIDER=dev (the only provider
 * implemented so far - see docs/04-design/AUTHENTICATION-DESIGN.md) is refused outright in
 * production, regardless of what the environment variable says, so a misconfigured deployment
 * fails loudly at startup instead of silently sending no real SMS. A real provider is added here
 * by name once a vendor is actually chosen and configured - never invented ahead of that.
 */
function createOtpProvider(config: ConfigService, devProvider: DevOtpProvider) {
    const providerName = config.get<string>('OTP_PROVIDER', 'dev');
    const nodeEnv = config.get<string>('NODE_ENV', 'development');

    if (providerName === 'dev') {
        if (nodeEnv === 'production') {
            throw new Error(
                'OTP_PROVIDER=dev is not allowed when NODE_ENV=production - configure a real ' +
                    'SMS provider before deploying. See docs/04-design/AUTHENTICATION-DESIGN.md.',
            );
        }
        return devProvider;
    }

    throw new Error(
        `Unknown OTP_PROVIDER "${providerName}" - no provider by that name is implemented yet.`,
    );
}

@Module({
    imports: [ConfigModule],
    providers: [
        DevOtpProvider,
        {
            provide: OTP_PROVIDER,
            useFactory: createOtpProvider,
            inject: [ConfigService, DevOtpProvider],
        },
        OtpService,
    ],
    exports: [OtpService, DevOtpProvider],
})
export class OtpModule {}
