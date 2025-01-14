import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventGateway } from 'src/modules/event/event.gateway';
import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';
import { PublicStrategy } from 'src/modules/auth/strategies/public.strategy';
import { UserModule } from 'src/modules/user/user.module';
import { MessageModule } from 'src/modules/message/message.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { NotificationService } from 'src/modules/notification/notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from 'src/modules/notification/notification.entity';
import { Interview } from 'src/modules/interview/interview.entity';
import { Message } from 'src/modules/message/message.entity';
import { MeetingRoom } from 'src/modules/meeting-room/meeting-room.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Interview, MeetingRoom]),
    UserModule,
    NotificationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('auth.secret'),
        signOptions: {
          expiresIn: configService.get('auth.expires'),
        },
      }),
    }),
  ],
  providers: [JwtStrategy, PublicStrategy, EventGateway, NotificationService,],
  exports: [EventGateway],
})
export class EventModule {}
