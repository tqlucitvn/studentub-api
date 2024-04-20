import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class MessageDto {
  @IsNotEmpty()
  projectId: number | string;

  @IsNotEmpty()
  receiverId: number | string;

  @IsNotEmpty()
  senderId: number | string;

  @IsOptional()
  senderSocketId: string = '';

  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  @IsIn([0, 1], { message: 'Invalid value' })
  messageFlag: number;
}