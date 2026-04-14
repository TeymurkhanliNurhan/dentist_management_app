import { Treatment } from '../treatment/entities/treatment.entity';
import { TreatmentPricePer } from '../treatment/treatment-price-per.enum';

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateToothTreatmentFeeSnapshot(
  treatment: Pick<Treatment, 'price' | 'pricePer'>,
  params: { toothCount: number; teethJaws: { upper_jaw: boolean }[] },
): number {
  const base = treatment.price;

  if (
    treatment.pricePer == null ||
    treatment.pricePer === TreatmentPricePer.MOUTH
  ) {
    return roundMoney(base);
  }

  if (treatment.pricePer === TreatmentPricePer.TOOTH) {
    return roundMoney(base * params.toothCount);
  }

  let hasUpper = false;
  let hasLower = false;
  for (const row of params.teethJaws) {
    if (row.upper_jaw) hasUpper = true;
    else hasLower = true;
  }
  const chinCount = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0);
  return roundMoney(base * chinCount);
}
