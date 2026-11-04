import { describe,it,expect } from 'vitest';
import { barberScheduleSchema,scheduleForm } from '../model/barber-schedule.schema';
const entry={id:'test',weekday:'MONDAY' as const,barbermanId:'A',range:{start:'07:00',end:'20:00'}};
describe('Contrato solicitado: formulário independente',()=>{
 it('permite períodos próprios sem grade geral',()=>{expect(barberScheduleSchema([]).safeParse(scheduleForm({state:'CUSTOM',schedules:[entry]})).success).toBe(true);});
 it('permite períodos próprios fora da grade do owner',()=>{expect(barberScheduleSchema([{...entry,barbermanId:null,range:{start:'08:00',end:'18:00'}}]).safeParse(scheduleForm({state:'CUSTOM',schedules:[entry]})).success).toBe(true);});
});
