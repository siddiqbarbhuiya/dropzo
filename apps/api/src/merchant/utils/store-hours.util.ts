import type { StoreOperatingHoursDto } from '../dto/store-operating-hours.dto.js';

export function isStoreOpen(
    status: string,
    openingHours?: StoreOperatingHoursDto | null,
    now: Date = new Date(),
): boolean {
    if (status !== 'ACTIVE') {
        return false;
    }

    if (!openingHours || Object.keys(openingHours).length === 0) {
        return true;
    }

    // Format day and time in Indian Standard Time (Asia/Kolkata)
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekdayPart = parts.find((p) => p.type === 'weekday')?.value.toLowerCase();
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    const minutePart = parts.find((p) => p.type === 'minute')?.value;

    if (!weekdayPart || !hourPart || !minutePart) {
        return true;
    }

    // Map 'mon', 'tue', etc.
    const dayKey = weekdayPart.slice(0, 3) as keyof StoreOperatingHoursDto;
    const todayHours = openingHours[dayKey];

    if (!todayHours) {
        // Explicitly closed or null for this weekday
        return false;
    }

    const currentFormatted = `${hourPart}:${minutePart}`;
    return currentFormatted >= todayHours.open && currentFormatted < todayHours.close;
}
