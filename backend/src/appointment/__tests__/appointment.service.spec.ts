import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from '../appointment.service';
import { AppointmentRepository } from '../appointment.repository';

describe('AppointmentService', () => {
  let service: AppointmentService;
  const repoMock = {
    createAppointmentForDentistAndPatient: jest.fn(),
    updateAppointmentEnsureOwnership: jest.fn(),
    deleteAppointmentEnsureOwnership: jest.fn(),
    findAppointmentsForDentist: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: AppointmentRepository, useValue: repoMock },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should include calculated, charged, and discount fees when creating an appointment', async () => {
    repoMock.createAppointmentForDentistAndPatient.mockResolvedValue({
      id: 1,
      startDate: new Date('2025-11-15T00:00:00.000Z'),
      endDate: null,
      calculatedFee: 250,
      chargedFee: 200,
      discountFee: 50,
    });

    await expect(
      service.create(7, {
        startDate: '2025-11-15',
        patient_id: 3,
        chargedFee: 200,
      } as any),
    ).resolves.toEqual({
      id: 1,
      startDate: '2025-11-15',
      endDate: null,
      calculatedFee: 250,
      chargedFee: 200,
      discountFee: 50,
    });

    expect(repoMock.createAppointmentForDentistAndPatient).toHaveBeenCalledWith(
      7,
      3,
      {
        startDate: new Date('2025-11-15'),
        endDate: null,
        chargedFee: 200,
      },
    );
  });

  it('should include fee fields when updating an appointment', async () => {
    repoMock.updateAppointmentEnsureOwnership.mockResolvedValue({
      id: 9,
      startDate: new Date('2025-11-16T00:00:00.000Z'),
      endDate: new Date('2025-11-17T00:00:00.000Z'),
      calculatedFee: 300,
      chargedFee: 280,
      discountFee: 20,
    });

    await expect(
      service.patch(7, 9, {
        endDate: '2025-11-17',
        chargedFee: 280,
      } as any),
    ).resolves.toEqual({
      id: 9,
      startDate: '2025-11-16',
      endDate: '2025-11-17',
      calculatedFee: 300,
      chargedFee: 280,
      discountFee: 20,
    });
  });
});
