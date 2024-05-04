import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DisableFlag, MessageFlag, NotifyFlag, TypeNotifyFlag } from 'src/common/common.enum';
import { InterviewCreateDto } from 'src/modules/interview/dto/interview-create.dto';
import { InterviewUpdateDto } from 'src/modules/interview/dto/interview-update.dto';
import { Interview } from 'src/modules/interview/interview.entity';
import { MessageService } from 'src/modules/message/message.service';
import { Repository } from 'typeorm';
import { Message } from 'src/modules/message/message.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { MeetingRoomService } from 'src/modules/meeting-room/meeting-room.service';

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly messageService: MessageService,
    private readonly notificationService: NotificationService,
    private readonly meetingRoomService: MeetingRoomService
  ) {}

  async findAll(): Promise<Interview[]> {
    const interviews = await this.interviewRepository.find({});
    return interviews.filter((i) => i.deletedAt === null);
  }

  async findById(id: number): Promise<any> {
    const interview = await this.interviewRepository.findOneBy({
      id,
    });
    const meetingRoom = await this.meetingRoomService.findById(id);
    const meetingRoomCode = meetingRoom?.meeting_room_code ? meetingRoom.meeting_room_code : null;
    return { ...interview, meetingRoomCode: meetingRoomCode };
  }

  async create(interview: InterviewCreateDto): Promise<number | string> {
    if (!interview.expired_at) {
      interview.expired_at = interview.endTime;
    }

    const meeting_room = await this.meetingRoomService.create({
      meeting_room_code: interview.meeting_room_code,
      meeting_room_id: interview.meeting_room_id,
      expired_at: interview.expired_at,
    });

    const newInterview = await this.interviewRepository.save({ ...interview, meetingRoomId: meeting_room.id });

    const message = await this.messageService.createMessage({
      senderId: interview.senderId,
      receiverId: interview.receiverId,
      projectId: interview.projectId,
      content: interview.content,
      interviewId: newInterview.id,
      messageFlag: MessageFlag.Interview,
    });

    await this.notificationService.createNotification({
      senderId: interview.senderId,
      receiverId: interview.receiverId,
      messageId: message,
      content: 'Interview created',
      notifyFlag: NotifyFlag.Unread,
      typeNotifyFlag: TypeNotifyFlag.Interview,
      title: interview.title,
      proposalId: null,
    });

    return message;
  }

  async update(id: number, interview: InterviewUpdateDto): Promise<void> {
    if (!this.interviewRepository.findOne({ where: { id } })) {
      throw new Error('Interview not found');
    }
    await this.interviewRepository.update(id, interview);
  }

  async delete(id: number): Promise<void> {
    if (!this.interviewRepository.findOne({ where: { id } })) {
      throw new Error('Interview not found');
    }
    await this.interviewRepository.update(id, { deletedAt: new Date() });
  }

  async disable(id: number): Promise<void> {
    const interview = await this.interviewRepository.findOne({ where: { id } });
    if (!interview) {
      throw new Error('Interview not found');
    }

    if (interview.disableFlag === DisableFlag.Disable) {
      throw new Error('Interview already disabled');
    }
    await this.interviewRepository.save({ ...interview, disableFlag: DisableFlag.Disable });
  }
}
