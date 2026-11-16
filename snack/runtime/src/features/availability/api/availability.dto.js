/**
 * DTOs brutos da Disponibilidade.
 *
 * ATENÇÃO: estes DTOs snake_case pertencem ao adapter MOCK e exercitam o
 * pipeline DTO -> mapper -> domínio -> UI. O backend HTTP real usa outro
 * contrato, tipado em `availability.backend.dto.ts`. A UI nunca consome
 * nenhum dos dois formatos diretamente.
 */
/** Weekdays válidos aceitos no payload. */
export const WEEKDAYS_RAW = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
];
