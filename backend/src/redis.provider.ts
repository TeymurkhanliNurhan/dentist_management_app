import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const RedisClientProvider: Provider = {
    provide: 'REDIS_CLIENT',
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
        return new Redis({
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
            password: configService.get<string>('REDIS_PASSWORD')  ,
        });
    },
};
