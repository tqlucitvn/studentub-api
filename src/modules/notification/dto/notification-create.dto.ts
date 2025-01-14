import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  receiverId: number | string;

  @IsNotEmpty()
  senderId: number | string;

  @IsOptional()
  messageId: number | string;

  @IsOptional()
  proposalId: number | string;

  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsIn([0, 1], { message: 'Invalid value' })
  notifyFlag: number;

  @IsNotEmpty()
  @IsIn([0, 1, 2, 3], { message: 'Invalid value' })
  typeNotifyFlag: number;

  @IsNotEmpty()
  content: string;
}
