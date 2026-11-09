// Manual Jest mock for @nestjs/throttler, mapped in via `moduleNameMapper` in both
// jest configs (package.json's unit-test config and jest.integration.config.cjs).
//
// @nestjs/throttler 6.7.1 ships a plain CommonJS build whose `require()` chain pulls in the
// now-ESM-only @nestjs/common. Real Node resolves that via CJS/ESM interop; Jest's own
// `--experimental-vm-modules` worker cannot, and crashes ("Must use import to load ES Module")
// the instant anything imports the real package - see auth.integration-spec.ts's own
// TestAuthAppModule comment for the first time this project hit it (there, by excluding
// ThrottlerModule from that one test's wiring). Rather than repeat that exclusion ad hoc in every
// test file that happens to load a controller importing the package, this mock makes the import
// itself a no-op under Jest everywhere, so production code can freely use @nestjs/throttler's
// real decorators/guards without any test file needing to know or care.
//
// Decorators are no-ops (the real ThrottlerGuard never runs under Jest either, since no test
// wires it up against a live HTTP server); only the shapes real callers actually reference here
// are stubbed.
export const Throttle = (): MethodDecorator & ClassDecorator => {
    return () => undefined;
};

export const SkipThrottle = (): MethodDecorator & ClassDecorator => {
    return () => undefined;
};

export class ThrottlerGuard {
    canActivate(): boolean {
        return true;
    }
}

export class ThrottlerModule {
    static forRoot(): { module: typeof ThrottlerModule } {
        return { module: ThrottlerModule };
    }
    static forRootAsync(): { module: typeof ThrottlerModule } {
        return { module: ThrottlerModule };
    }
}
