import * as dotenv from 'dotenv';
dotenv.config();

import { BullModule } from '@nestjs/bull';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from 'nestjs-pino';
import configuration from 'src/config/configuration';
import { TypeOrmConfigService } from 'src/database/typeorm-config.service';
import loggerConfig from 'src/logger/config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserModule } from 'src/modules/user/user.module';
import { MeetingRoomModule } from 'src/modules/meeting-room/meeting-room.module';
import { HttRequestContextMiddleware } from 'src/shared/http-request-context/http-request-context.middleware';
import { HttRequestContextModule } from 'src/shared/http-request-context/http-request-context.module';
import { RequestIdHeaderMiddleware } from 'src/shared/middlewares/request-id-header.middleware';
import { DataSource } from 'typeorm';
import { ProposalModule } from 'src/modules/proposal/proposal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options) => {
        const dataSource = await new DataSource(options).initialize();
        return dataSource;
      },
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      },
    }),
    HttRequestContextModule,
    LoggerModule.forRootAsync(loggerConfig),
    AuthModule,
    UserModule,
    ProposalModule,
    MeetingRoomModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdHeaderMiddleware, HttRequestContextMiddleware).forRoutes('*');
  }
}
