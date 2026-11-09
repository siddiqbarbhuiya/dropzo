import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, Matches, ValidateNested } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DayHoursDto {
    @ApiPropertyOptional({ example: '09:00', description: '24-hour "HH:mm".' })
    @Matches(TIME_PATTERN, { message: 'open must be a 24-hour "HH:mm" time.' })
    open!: string;

    @ApiPropertyOptional({ example: '21:00', description: '24-hour "HH:mm".' })
    @Matches(TIME_PATTERN, { message: 'close must be a 24-hour "HH:mm" time.' })
    close!: string;
}

// A missing or null day means closed that day. Validated here (shape, time format); the service
// additionally checks open < close - a cross-field rule class-validator can't express per-nested
// object without a custom validator class, and this is simpler at this scale.
export class StoreOperatingHoursDto {
    @ApiPropertyOptional({ type: DayHoursDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayHoursDto)
    mon?: DayHoursDto | null;

    @ApiPropertyOptional({ type: DayHoursDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayHoursDto)
    tue?: DayHoursDto | null;

    @ApiPropertyOptional({ type: DayHoursDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayHoursDto)
    wed?: DayHoursDto | null;

    @ApiPropertyOptional({ type: DayHoursDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayHoursDto)
    thu?: DayHoursDto | null;

    @ApiPropertyOptional({ type: DayHoursDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayHoursDto)
    fri?: DayHoursDto | null;

    @ApiPropertyOptional({ type: DayHoursDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayHoursDto)
    sat?: DayHoursDto | null;

    @ApiPropertyOptional({ type: DayHoursDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayHoursDto)
    sun?: DayHoursDto | null;
}

export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
