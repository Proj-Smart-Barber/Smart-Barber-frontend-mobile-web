import { getOperationalContext } from '../../auth/model/operational-context';
/** Shared by route and menu: account labels alone never grant unit access. */
export function getBarberScheduleContext(session) {
    var _a;
    const context = getOperationalContext(session);
    if (!(context === null || context === void 0 ? void 0 : context.userId) || ((_a = session.barbershop) === null || _a === void 0 ? void 0 : _a.id) !== context.shopId)
        return null;
    return context;
}
