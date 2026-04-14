import { AppointmentRepository } from '../appointment.repository';

describe('AppointmentRepository', () => {
  const appointmentRepoMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const dataSourceMock = {
    getRepository: jest.fn(),
  };

  let repository: AppointmentRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    dataSourceMock.getRepository.mockReturnValue(appointmentRepoMock);
    repository = new AppointmentRepository(dataSourceMock as any);
    appointmentRepoMock.save.mockImplementation(async (entity: any) => entity);
  });

  it('does not change calculatedFee when only chargedFee is edited', async () => {
    appointmentRepoMock.findOne.mockResolvedValue({
      id: 11,
      startDate: new Date('2026-04-01'),
      endDate: null,
      calculatedFee: 500,
      chargedFee: 450,
      discountFee: 50,
      dentist: { id: 7 },
    });

    const updated = await repository.updateAppointmentEnsureOwnership(7, 11, {
      chargedFee: 430,
    });

    expect(updated.calculatedFee).toBe(500);
    expect(updated.discountFee).toBe(70);
    expect(appointmentRepoMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 11,
        calculatedFee: 500,
        chargedFee: 430,
        discountFee: 70,
      }),
    );
  });

  it('recalculates calculatedFee from treatment snapshots when requested', async () => {
    appointmentRepoMock.findOne.mockResolvedValue({
      id: 12,
      calculatedFee: 0,
      chargedFee: 120,
      toothTreatments: [
        {
          feeSnapshot: 100,
          toothTreatmentMedicines: [{ medicinePriceSnapshot: 20 }],
        },
      ],
    });

    const recalculated = await repository.recalculateAppointmentFees(12);

    expect(recalculated.calculatedFee).toBe(120);
    expect(recalculated.discountFee).toBe(0);
    expect(appointmentRepoMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        calculatedFee: 120,
        chargedFee: 120,
        discountFee: 0,
      }),
    );
  });
});
