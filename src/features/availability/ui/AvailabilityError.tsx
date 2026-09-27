import { Alert } from '@/shared/ui';
import type { NormalizedAvailabilityError } from '../api/normalize-availability-error';

interface AvailabilityErrorProps {
  error: NormalizedAvailabilityError;
}

/** Área de alerta global de erros — Critério de Aceite 4. */
export function AvailabilityError({ error }: AvailabilityErrorProps) {
  return (
    <Alert
      variant="error"
      title={error.title}
      message={error.description}
    />
  );
}
