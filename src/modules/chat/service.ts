import { prisma } from '../../shared/utils/prisma';

export interface ChatMessageDTO {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  authorEmail: string;
  roomName: string;
}

async function getOrCreateRoom(roomName: string) {
  return prisma.room.upsert({
    where: { name: roomName },
    update: {},
    create: { name: roomName },
  });
}

export const chatService = {
  async saveMessage(params: {
    roomName: string;
    content: string;
    authorId: string;
  }): Promise<ChatMessageDTO> {
    const room = await getOrCreateRoom(params.roomName);

    const message = await prisma.message.create({
      data: {
        content: params.content,
        roomId: room.id,
        authorId: params.authorId,
      },
      include: { author: { select: { email: true } } },
    });

    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      authorId: message.authorId,
      authorEmail: message.author.email,
      roomName: room.name,
    };
  },

  async getRecentMessages(roomName: string, limit = 50): Promise<ChatMessageDTO[]> {
    const room = await prisma.room.findUnique({ where: { name: roomName } });
    if (!room) return [];

    const messages = await prisma.message.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { author: { select: { email: true } } },
    });

    return messages
      .map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        authorId: m.authorId,
        authorEmail: m.author.email,
        roomName,
      }))
      .reverse();
  },
};
