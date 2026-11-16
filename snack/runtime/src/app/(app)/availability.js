import { useLocalSearchParams } from 'expo-router';
import { UnifiedAvailabilityContainer } from '../../features/availability';
import { useSession } from '../../features/auth';
export default function AvailabilityRoute() {
    var _a, _b, _c, _d;
    const { barbershop } = useSession();
    const params = useLocalSearchParams();
    return (<UnifiedAvailabilityContainer initialScope={params.scope} barbershopId={(_a = barbershop === null || barbershop === void 0 ? void 0 : barbershop.id) !== null && _a !== void 0 ? _a : null} barbermanId={(_b = params.barbermanId) !== null && _b !== void 0 ? _b : null} professionalName={(_d = (_c = params.professionalName) !== null && _c !== void 0 ? _c : params.name) !== null && _d !== void 0 ? _d : null}/>);
}
