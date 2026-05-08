import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RoomRepository } from './room.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { GetRoomDto } from './dto/get-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(private readonly repo: RoomRepository) {}

  async create(dentistId: number, dto: CreateRoomDto) {
    try {
      const created = await this.repo.createForDentist(dentistId, dto);
      const msg = `Dentist with id ${dentistId} created Room with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', RoomService.name, msg);
      return created;
    } catch {
      throw new BadRequestException('Failed to create room');
    }
  }

  async findAll(dentistId: number, dto: GetRoomDto) {
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(dentistId: number, id: number, dto: UpdateRoomDto) {
    try {
      const updated = await this.repo.updateForDentist(dentistId, id, dto);
      const msg = `Dentist with id ${dentistId} updated Room with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', RoomService.name, msg);
      return updated;
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Room not found');
      throw new BadRequestException('Failed to update room');
    }
  }

  async delete(dentistId: number, id: number) {
    try {
      await this.repo.deleteForDentist(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted Room with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', RoomService.name, msg);
      return { message: 'Room deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Room not found');
      throw new BadRequestException('Failed to delete room');
    }
  }
}
