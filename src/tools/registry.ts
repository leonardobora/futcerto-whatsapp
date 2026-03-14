// =============================================================================
// registry.ts - Registro de todas as tools no formato OpenAI function calling
// FutCerto v2.0
// =============================================================================

import { searchCourtsSchema } from "./search-courts";
import { createBookingSchema } from "./create-booking";
import { getBookingsSchema } from "./get-bookings";
import { cancelBookingSchema } from "./cancel-booking";
import { approveBookingSchema } from "./approve-booking";
import { rejectBookingSchema } from "./reject-booking";
import { getWeeklyScheduleSchema } from "./weekly-schedule";
import { blockTimeslotSchema } from "./block-timeslot";

// Formato OpenAI ChatCompletionTool
function toOpenAITool(schema: {
  name: string;
  description: string;
  parameters: object;
}) {
  return {
    type: "function" as const,
    function: {
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
    },
  };
}

// Tools disponíveis para o Jogador Agent
export const JOGADOR_TOOLS = [
  toOpenAITool(searchCourtsSchema),
  toOpenAITool(createBookingSchema),
  toOpenAITool(getBookingsSchema),
  toOpenAITool(cancelBookingSchema),
];

// Tools disponíveis para o Gestor Agent
export const GESTOR_TOOLS = [
  toOpenAITool(getBookingsSchema),   // Para listar pendentes
  toOpenAITool(approveBookingSchema),
  toOpenAITool(rejectBookingSchema),
  toOpenAITool(getWeeklyScheduleSchema),
  toOpenAITool(blockTimeslotSchema),
];

// Todas as tools (para referência)
export const ALL_TOOLS = [
  ...JOGADOR_TOOLS,
  toOpenAITool(approveBookingSchema),
  toOpenAITool(rejectBookingSchema),
  toOpenAITool(getWeeklyScheduleSchema),
  toOpenAITool(blockTimeslotSchema),
];

// Mapa de função pelo nome para execução dinâmica
export const TOOL_FUNCTION_MAP: Record<string, string> = {
  search_courts: "searchCourts",
  create_booking: "createBooking",
  get_user_bookings: "getBookings",
  cancel_booking: "cancelBooking",
  approve_booking: "approveBooking",
  reject_booking: "rejectBooking",
  get_weekly_schedule: "getWeeklySchedule",
  block_timeslot: "blockTimeslot",
};
