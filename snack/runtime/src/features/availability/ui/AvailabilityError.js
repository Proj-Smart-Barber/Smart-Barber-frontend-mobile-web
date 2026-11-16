import { Alert } from '../../../shared/ui';
/** Área de alerta global de erros — Critério de Aceite 4. */
export function AvailabilityError({ error }) {
    return (<Alert variant="error" title={error.title} message={error.description}/>);
}
