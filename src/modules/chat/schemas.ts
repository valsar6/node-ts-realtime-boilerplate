import { z } from 'zod';
import { CONSTANTS } from '../../config/constants';

export const joinRoomSchema = z.object({
  roomName: z.string().min(1).max(CONSTANTS.ROOM_NAME_MAX_LENGTH),
});

export const sendMessageSchema = z.object({
  roomName: z.string().min(1).max(CONSTANTS.ROOM_NAME_MAX_LENGTH),
  content: z.string().min(1).max(CONSTANTS.CHAT_MESSAGE_MAX_LENGTH),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
