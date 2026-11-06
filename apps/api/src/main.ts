import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.enableCors();

    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('Dropzo API')
            .setDescription('Dropzo backend API documentation (development only)')
            .setVersion('0.1.0')
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
    }

    const port = configService.get<number>('PORT', 3000);
    await app.listen(port);
    console.log(`Dropzo API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
