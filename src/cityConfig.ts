export type RentalPricing = {
  currency: string;
  hourlyRate: number;
  nonReturnFee: number;
  returnDeadlineHours: number;
};

// Phoenix, Arizona is the canonical pricing model for every ChargeDrops city.
export const STANDARD_RENTAL_PRICING: RentalPricing = {
  currency: "USD",
  hourlyRate: 3,
  nonReturnFee: 35,
  returnDeadlineHours: 72,
};

export const normalizeRentalPricing = (
  pricing?: Partial<RentalPricing> | null
): RentalPricing =>
  pricing &&
  typeof pricing.hourlyRate === "number" &&
  typeof pricing.nonReturnFee === "number" &&
  typeof pricing.returnDeadlineHours === "number"
    ? {
        currency: pricing.currency || STANDARD_RENTAL_PRICING.currency,
        hourlyRate: pricing.hourlyRate,
        nonReturnFee: pricing.nonReturnFee,
        returnDeadlineHours: pricing.returnDeadlineHours,
      }
    : { ...STANDARD_RENTAL_PRICING };
