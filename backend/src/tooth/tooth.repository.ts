import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tooth } from './entities/tooth.entity';

@Injectable()
export class ToothRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get toothRepo(): Repository<Tooth> {
        return this.dataSource.getRepository(Tooth);
    }

    async findTeethWithFilters(
        filters: { id?: number; number?: number; permanent?: boolean; upperJaw?: boolean },
        language: string,
    ): Promise<any[]> {
        const queryBuilder = this.toothRepo
            .createQueryBuilder('tooth')
            .leftJoinAndSelect('tooth.translation', 'translation');

        if (filters.id !== undefined) {
            queryBuilder.andWhere('tooth.id = :id', { id: filters.id });
        }
        if (filters.number !== undefined) {
            queryBuilder.andWhere('tooth.number = :number', { number: filters.number });
        }
        if (filters.permanent !== undefined) {
            queryBuilder.andWhere('tooth.permanent = :permanent', { permanent: filters.permanent });
        }
        if (filters.upperJaw !== undefined) {
            queryBuilder.andWhere('tooth.upper_jaw = :upperJaw', { upperJaw: filters.upperJaw });
        }

        const teeth = await queryBuilder.getMany();

        const validLanguages = ['english', 'azerbaijani', 'russian'];
        if (!validLanguages.includes(language.toLowerCase())) {
            throw new Error(`Invalid language: ${language}. Must be one of: ${validLanguages.join(', ')}`);
        }

        return teeth.map(tooth => {
            const translation = tooth.translation;
            let name = '';
            
            if (translation) {
                switch (language.toLowerCase()) {
                    case 'english':
                        name = translation.nameInEnglish;
                        break;
                    case 'azerbaijani':
                        name = translation.nameInAzerbaijani;
                        break;
                    case 'russian':
                        name = translation.nameInRussian;
                        break;
                }
            }

            return {
                id: tooth.id,
                number: tooth.number,
                permanent: tooth.permanent,
                upperJaw: tooth.upper_jaw,
                name: name,
            };
        });
    }
}


