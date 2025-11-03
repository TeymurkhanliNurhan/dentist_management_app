import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ToothRepository } from './tooth.repository';
import { GetToothDto } from './dto/get-tooth.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class ToothService {
    private readonly logger = new Logger(ToothService.name);

    constructor(private readonly toothRepository: ToothRepository) {}

    async findAll(dto: GetToothDto) {
        try {
            const teeth = await this.toothRepository.findTeethWithFilters(
                {
                    id: dto.id,
                    number: dto.number,
                    permanent: dto.permanent,
                    upperJaw: dto.upperJaw,
                },
                dto.language,
            );
            const msg = `Retrieved ${teeth.length} tooth/teeth with language: ${dto.language}`;
            this.logger.log(msg);
            LogWriter.append('log', ToothService.name, msg);
            return teeth;
        } catch (e: any) {
            if (e?.message?.includes('Invalid language')) {
                throw new BadRequestException(e.message);
            }
            throw e;
        }
    }
}
