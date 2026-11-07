import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { RequestOtpDto } from './dto/request-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { RequestUser } from './auth.types.js';

function requestContext(req: Request) {
    return {
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
    };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Public()
    @Post('send-otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request an OTP for the given phone number (login or registration).' })
    @ApiOkResponse({ description: 'OTP sent, or still in its resend cooldown window.' })
    async sendOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
        const result = await this.auth.requestOtp(dto.phone, requestContext(req));
        if (result.outcome === 'cooldown') {
            return { status: 'cooldown', retryAfterSeconds: result.retryAfterSeconds };
        }
        return { status: 'sent' };
    }

    @Public()
    @Post('verify-otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify an OTP and receive an access/refresh token pair.' })
    @ApiOkResponse({ description: 'OTP verified; a session was created.' })
    async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
        const result = await this.auth.verifyOtpAndAuthenticate(
            dto.phone,
            dto.code,
            requestContext(req),
        );

        switch (result.outcome) {
            case 'verified':
                return {
                    accessToken: result.tokens.accessToken,
                    refreshToken: result.tokens.refreshToken,
                    isNewAccount: result.isNewAccount,
                };
            case 'account_suspended':
                throw new ForbiddenException('This account is suspended.');
            case 'locked':
                throw new UnauthorizedException('Too many incorrect attempts. Request a new OTP.');
            case 'expired':
                throw new UnauthorizedException('This OTP has expired. Request a new one.');
            case 'invalid':
            default:
                throw new UnauthorizedException('Incorrect or unknown OTP.');
        }
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Rotate a refresh token for a new access/refresh token pair.' })
    @ApiOkResponse({ description: 'A new token pair was issued.' })
    async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
        const tokens = await this.auth.refresh(dto.refreshToken, requestContext(req));
        return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Revoke the session behind the given refresh token.' })
    @ApiOkResponse({ description: 'The session was revoked (if it was still active).' })
    async logout(@Body() dto: RefreshTokenDto, @CurrentUser() user: RequestUser) {
        await this.auth.logout(dto.refreshToken, user.id);
        return { status: 'ok' };
    }

    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Revoke every active session for the current user.' })
    @ApiOkResponse({ description: 'Every active session was revoked.' })
    async logoutAll(@CurrentUser() user: RequestUser) {
        const count = await this.auth.logoutAll(user.id);
        return { sessionsRevoked: count };
    }

    @Get('me')
    @ApiOperation({ summary: 'Return the authenticated user and their roles.' })
    @ApiOkResponse({ description: 'The authenticated user.' })
    async me(@CurrentUser() user: RequestUser) {
        return this.auth.getMe(user.id);
    }

    @Get('sessions')
    @ApiOperation({ summary: "List the current user's active sessions." })
    @ApiOkResponse({ description: 'Active sessions for the authenticated user.' })
    async sessions(@CurrentUser() user: RequestUser) {
        return this.auth.listSessions(user.id);
    }

    @Delete('sessions/:id')
    @ApiOperation({ summary: "Revoke one of the current user's sessions by id." })
    @ApiOkResponse({ description: 'The session was revoked, if it belonged to the caller.' })
    async revokeSession(@Param('id') id: string, @CurrentUser() user: RequestUser) {
        const revoked = await this.auth.revokeSession(user.id, id);
        return { revoked };
    }
}
