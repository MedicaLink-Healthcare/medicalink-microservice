export const PROVIDER_PATTERNS = {
  APPOINTMENT_CONTEXT: 'provider.appointmentContext.get',
  SLOTS_LIST: 'provider.slots.list',
  MONTH_AVAILABILITY: 'provider.slots.monthAvailability',
} as const;

export type ProviderPattern =
  (typeof PROVIDER_PATTERNS)[keyof typeof PROVIDER_PATTERNS];
