import { isStoreOpen } from './store-hours.util.js';
import type { StoreOperatingHoursDto } from '../dto/store-operating-hours.dto.js';

describe('isStoreOpen', () => {
    const regularHours: StoreOperatingHoursDto = {
        mon: { open: '08:00', close: '20:00' },
        tue: { open: '08:00', close: '20:00' },
        wed: { open: '08:00', close: '20:00' },
        thu: { open: '08:00', close: '20:00' },
        fri: { open: '08:00', close: '20:00' },
        sat: { open: '09:00', close: '18:00' },
        sun: null, // Closed on Sundays
    };

    it('returns false if store status is not ACTIVE regardless of time', () => {
        // Monday 10:00 AM IST (2026-11-16T04:30:00Z)
        const mondayMorning = new Date('2026-11-16T04:30:00Z');
        expect(isStoreOpen('PAUSED', regularHours, mondayMorning)).toBe(false);
        expect(isStoreOpen('CLOSED', regularHours, mondayMorning)).toBe(false);
        expect(isStoreOpen('SUSPENDED', regularHours, mondayMorning)).toBe(false);
    });

    it('returns true during open hours in IST', () => {
        // Monday 12:00 PM IST is 06:30 UTC
        const mondayNoon = new Date('2026-11-16T06:30:00Z');
        expect(isStoreOpen('ACTIVE', regularHours, mondayNoon)).toBe(true);
    });

    it('returns false outside open hours in IST', () => {
        // Monday 9:00 PM IST is 15:30 UTC (store closes at 20:00)
        const mondayNight = new Date('2026-11-16T15:30:00Z');
        expect(isStoreOpen('ACTIVE', regularHours, mondayNight)).toBe(false);

        // Monday 7:00 AM IST is 01:30 UTC (store opens at 08:00)
        const mondayEarly = new Date('2026-11-16T01:30:00Z');
        expect(isStoreOpen('ACTIVE', regularHours, mondayEarly)).toBe(false);
    });

    it('returns false on days where hours are null/closed', () => {
        // Sunday 12:00 PM IST is 2026-11-15T06:30:00Z
        const sundayNoon = new Date('2026-11-15T06:30:00Z');
        expect(isStoreOpen('ACTIVE', regularHours, sundayNoon)).toBe(false);
    });

    it('returns true for ACTIVE store when opening hours are empty or null', () => {
        const mondayNoon = new Date('2026-11-16T06:30:00Z');
        expect(isStoreOpen('ACTIVE', null, mondayNoon)).toBe(true);
        expect(isStoreOpen('ACTIVE', undefined, mondayNoon)).toBe(true);
        expect(isStoreOpen('ACTIVE', {}, mondayNoon)).toBe(true);
    });
});
