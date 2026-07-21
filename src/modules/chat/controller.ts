import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { chatService } from './service';

export const chatController = {
  getRoomHistory: asyncHandler(async (req: Request, res: Response) => {
    const { roomName } = req.params as { roomName: string };
    const messages = await chatService.getRecentMessages(roomName);
    res.status(200).json({ roomName, messages });
  }),
};
