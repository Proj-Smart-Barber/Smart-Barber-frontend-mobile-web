export function getOperationNameForAction(action) {
    switch (action) {
        case 'CREATE':
            return 'CREATE_BOOKING';
        case 'RESCHEDULE':
            return 'RESCHEDULE_BOOKING';
        case 'CANCEL':
            return 'CANCEL_BOOKING';
        case 'COMPLETE':
        case 'NO_SHOW':
            return 'TRANSITION_BOOKING_STATUS';
    }
}
export function sanitizeCommandForStorage(command) {
    return {
        schemaVersion: 1,
        customerId: command.action === 'CREATE' ? command.customerId : undefined,
        referenceOnly: 'reason' in command && Boolean(command.reason),
        slotStartAt: 'slotStartAt' in command ? command.slotStartAt : undefined,
        action: command.action,
        scope: command.scope,
        shopId: command.shopId,
        bookingId: 'bookingId' in command ? command.bookingId : undefined,
        expectedVersion: 'expectedVersion' in command ? command.expectedVersion : undefined,
        date: 'date' in command ? command.date : undefined,
        startTime: 'startTime' in command ? command.startTime : undefined,
        barbermanId: 'barbermanId' in command ? command.barbermanId : undefined,
        serviceIds: 'serviceIds' in command ? command.serviceIds : undefined,
        expectedTotalPriceInCents: 'expectedTotalPriceInCents' in command ? command.expectedTotalPriceInCents : undefined,
        expectedDurationInMinutes: 'expectedDurationInMinutes' in command ? command.expectedDurationInMinutes : undefined,
    };
}
