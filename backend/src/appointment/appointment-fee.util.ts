import { Appointment } from './entities/appointment.entity';

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 0;
};

export const calculateAppointmentCalculatedFee = (appointment: Appointment): number => {
  const total = (appointment.toothTreatments ?? []).reduce((appointmentTotal, toothTreatment) => {
    const treatmentFee = toNumber(toothTreatment.feeSnapshot ?? toothTreatment.treatment?.price);
    const medicineFee = (toothTreatment.toothTreatmentMedicines ?? []).reduce((medicineTotal, toothTreatmentMedicine) => {
      const unitPrice = toNumber(toothTreatmentMedicine.medicinePriceSnapshot ?? toothTreatmentMedicine.medicineEntity?.price);
      const quantity = Math.max(1, toNumber(toothTreatmentMedicine.quantity || 1));
      return medicineTotal + unitPrice * quantity;
    }, 0);

    return appointmentTotal + treatmentFee + medicineFee;
  }, 0);

  return roundMoney(total);
};

export const calculateAppointmentDiscountFee = (calculatedFee: number, chargedFee: number | null | undefined): number | null => {
  if (chargedFee === null || chargedFee === undefined) {
    return null;
  }

  return roundMoney(calculatedFee - chargedFee);
};

