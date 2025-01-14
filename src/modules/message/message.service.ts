import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/modules/company/company.entity';
import { MessageResDto } from 'src/modules/message/dto/message-res.dto';
import { MessageGetDto } from 'src/modules/message/dto/message_get.dto';
import { MessageGet } from 'src/modules/message/interface/message_get.interface';
import { Message } from 'src/modules/message/message.entity';
import { Project } from 'src/modules/project/project.entity';
import { Student } from 'src/modules/student/student.entity';
import { HttpRequestContextService } from 'src/shared/http-request-context/http-request-context.service';
import { Brackets, In, Repository } from 'typeorm';
import { NotificationService } from 'src/modules/notification/notification.service';
import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EventGateway } from 'src/modules/event/event.gateway';
import { NotifyFlag, TypeNotifyFlag } from 'src/common/common.enum';
import { MessageCreateDto } from 'src/modules/message/dto/message-create.dto';
import { User } from 'src/modules/user/user.entity';

@Injectable()
export class MessageService {
  @WebSocketServer() private server: Server;
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private readonly httpContext: HttpRequestContextService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private readonly notificationService: NotificationService,
    private eventGateway: EventGateway
  ) { }

  async searchProjectId(projectId: number): Promise<MessageResDto[] | any> {
    const userId = this.httpContext.getUser().id;

    const receiverMessages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .leftJoin('message.receiver', 'receiver')
      .leftJoinAndSelect('message.interview', 'interview')
      .leftJoinAndSelect('interview.meetingRoom', 'meetingRoom')
      .select([
        'message.id',
        'message.content',
        'message.createdAt',
        'sender.id',
        'sender.fullname',
        'receiver.id',
        'receiver.fullname',
        'interview',
        'meetingRoom',
      ])
      .where('message.projectId = :projectId', { projectId })
      .andWhere('message.senderId = :userId', { userId })
      .distinct(true)
      .getMany();

    const senderMessages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .leftJoin('message.receiver', 'receiver')
      .leftJoinAndSelect('message.interview', 'interview')
      .leftJoinAndSelect('interview.meetingRoom', 'meetingRoom')
      .select([
        'message.id',
        'message.content',
        'message.createdAt',
        'sender.id',
        'sender.fullname',
        'receiver.id',
        'receiver.fullname',
        'interview',
        'meetingRoom',
      ])
      .where('message.projectId = :projectId', { projectId })
      .andWhere('message.receiverId = :userId', { userId })
      .distinct(true)
      .getMany();

    const allMessages = [...receiverMessages, ...senderMessages];

    const uniqueMessagesMap = new Map<number | string, MessageResDto>();
    allMessages.forEach((message) => {
      const existingMessage = uniqueMessagesMap.get(
        message.receiver.id === userId ? message.sender.id : message.receiver.id
      );
      if (!existingMessage || message.createdAt > existingMessage.createdAt) {
        uniqueMessagesMap.set(message.receiver.id === userId ? message.sender.id : message.receiver.id, message);
      }
    });

    const uniqueMessages = Array.from(uniqueMessagesMap.values());

    return uniqueMessages;
  }

  async searchProjectUserId(projectId: number, userId: number): Promise<MessageResDto[] | any> {
    const loginUserId = this.httpContext.getUser().id;

    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .leftJoin('message.receiver', 'receiver')
      .leftJoinAndSelect('message.interview', 'interview')
      .leftJoinAndSelect('interview.meetingRoom', 'meetingRoom')
      .select([
        'message.id',
        'message.content',
        'message.createdAt',
        'sender.id',
        'sender.fullname',
        'receiver.id',
        'receiver.fullname',
        'interview',
        'meetingRoom',
      ])
      .where('message.projectId = :projectId', { projectId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('message.senderId = :userId', { userId })
            .andWhere('message.receiverId = :loginUserId', { loginUserId: loginUserId })
            .orWhere(
              new Brackets((qb) => {
                qb.where('message.senderId = :loginUserId', { loginUserId: loginUserId }).andWhere(
                  'message.receiverId = :userId',
                  { userId }
                );
              })
            );
        })
      )
      .orderBy('message.createdAt', 'ASC')
      .distinct(true)
      .getMany();

    return messages;
  }

  async searchUserId(): Promise<MessageResDto[] | any> {
    const loginUserId = this.httpContext.getUser().id;

    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .leftJoinAndSelect('message.interview', 'interview')
      .leftJoinAndSelect('interview.meetingRoom', 'meetingRoom')
      .leftJoinAndSelect('message.project', 'project')
      .leftJoinAndSelect('message.notifications', 'notification')
      .select([
        'message.id',
        'message.content',
        'message.createdAt',
        'sender.id',
        'sender.fullname',
        'receiver.id',
        'receiver.fullname',
        'interview',
        'project',
        'meetingRoom',
        'notification.id',
        'notification.notifyFlag'
      ])
      .andWhere(
        new Brackets((qb) => {
          qb.where('message.receiverId = :loginUserId', { loginUserId: loginUserId }).orWhere(
            'message.senderId = :loginUserId',
            { loginUserId: loginUserId }
          );
        })
      )
      .orderBy('message.createdAt', 'ASC')
      .getMany();

    const groupedMessages = messages.reduce((acc, message) => {
      const senderId = message.sender.id;
      const receiverId = message.receiver.id;
      const projectId = message.project.id;

      const key1 = `${projectId}_${senderId}_${receiverId}`;
      const key2 = `${projectId}_${receiverId}_${senderId}`;

      const key = acc[key1] ? key1 : acc[key2] ? key2 : key1;

      if (!acc[key]) {
        acc[key] = {
          project: message.project,
          messages: [],
        };
      }
      message.project = undefined;

      if (message.notifications.length > 0) {
        (message as any).notifications = {
          id: message.notifications[message.notifications.length - 1].id,
          notifyFlag: message.notifications[message.notifications.length - 1].notifyFlag
        };
      } else {
        message.notifications = null
      }

      acc[key].messages.push(message);
      return acc;
    }, {});

    const latestMessages = Object.values(groupedMessages).map((group: any) => {
      const latestMessage = group.messages.reduce((latest, current) => {
        if (!latest || current.createdAt > latest.createdAt) {
          return current;
        }
        return latest;
      }, null);

      latestMessage.project = group.project;

      return latestMessage;
    });

    return latestMessages;
  }

  //TODO: Group seminar by project
  async findMessage(messageGetDto: MessageGetDto): Promise<MessageGet> {
    this.logger.debug(`findMessage: ${JSON.stringify(messageGetDto)}`);

    const userId = this.httpContext.getUser()?.id;
    if (!userId) {
      throw new BadRequestException(`User not found in the request context.`);
    }

    const listFilterId = [Number(messageGetDto.receiverId), userId];
    const page = Number(messageGetDto.page) || 1;
    const pageSize = Number(messageGetDto.pageSize) || 10;

    // find message with limit page and pageSize
    const message = await this.messageRepository.find({
      where: {
        projectId: messageGetDto.projectId,
        receiverId: In(listFilterId),
        senderId: In(listFilterId),
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: {
        createdAt: 'DESC',
      },
    });

    // count total message
    const totalMessages = await this.messageRepository.count({
      where: {
        projectId: messageGetDto.projectId,
        receiverId: In(listFilterId),
        senderId: In(listFilterId),
      },
    });

    // calculate total page
    const totalPage = Math.ceil(totalMessages / pageSize);

    return {
      messages: message,
      page,
      totalPage,
      pageSize,
    };
  }

  async createMessage(data: MessageCreateDto): Promise<void> {
    const senderId = Number(data.senderId);
    const receiverId = Number(data.receiverId);
    const projectId = Number(data.projectId);
    const content = data.content;
    const messageFlag = data.messageFlag;

    try {
      if (!(await this.projectRepository.findOne({ where: { id: projectId } }))) {
        throw new NotFoundException(`Project not found`);
      }

      const newMessage = await this.messageRepository.create({
        senderId,
        receiverId,
        projectId,
        content,
        messageFlag: messageFlag,
      });

      await this.messageRepository.save(newMessage);

      const user = await this.userRepository.findOne({ where: { id: senderId } });

      const notificationId = await this.notificationService.createNotification({
        senderId: senderId,
        receiverId: receiverId,
        messageId: newMessage.id,
        content: `New message created`,
        notifyFlag: NotifyFlag.Unread,
        typeNotifyFlag: TypeNotifyFlag.Chat,
        title: `New message is sent by ${user.fullname}`,
        proposalId: null,
      });

      await this.eventGateway.sendNotification({
        notificationId: notificationId as string,
        receiverId: data.receiverId as string,
        senderId: data.senderId as string,
        projectId: data.projectId as string,
      });
    } catch (Exception) {
      this.logger.error(`Error when create message: ${Exception}`);
      return;
    }
  }

  async createMessageForNotis(data: any): Promise<string | number> {
    const senderId = Number(data.senderId);
    const receiverId = Number(data.receiverId);
    const projectId = Number(data.projectId);
    const content = data.content;
    const messageFlag = data.messageFlag;
    const interviewId = Number(data.interviewId);

    try {
      if (!(await this.projectRepository.findOne({ where: { id: projectId } }))) {
        throw new NotFoundException(`Project not found`);
      }

      const newMessage = this.messageRepository.create({
        senderId,
        receiverId,
        projectId,
        content,
        messageFlag: messageFlag,
        interviewId: interviewId ? Number(interviewId) : null,
      });

      await this.messageRepository.save(newMessage);

      return newMessage.id;
    } catch (Exception) {
      this.logger.error(`Error when create message: ${Exception}`);
      return;
    }
  }

  async deleteMessage(id: string): Promise<string> {
    this.logger.debug(`deleteMessage: ${id}`);

    const userId = this.httpContext.getUser()?.id;
    if (!userId) {
      throw new BadRequestException(`User not found in the request context.`);
    }

    await this.messageRepository.delete({ id, senderId: userId });

    return 'success';
  }

  // async updateMessage(data: s): Promise<any> {
  //   this.logger.debug(`updateMessage: ${id}`);

  //   const userId = this.httpContext.getUser()?.id;
  //   if (!userId) {
  //     throw new BadRequestException(`User not found in the request context.`);
  //   }
  // }
}
