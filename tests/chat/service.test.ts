import { chatService } from '../../src/modules/chat/service';
import { prisma } from '../../src/shared/utils/prisma';

jest.mock('../../src/shared/utils/prisma', () => ({
  prisma: {
    room: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  room: { upsert: jest.Mock; findUnique: jest.Mock };
  message: { create: jest.Mock; findMany: jest.Mock };
};

describe('chatService.saveMessage', () => {
  it('creates the room if it does not exist yet, then persists the message', async () => {
    mockedPrisma.room.upsert.mockResolvedValue({ id: 'room-1', name: 'general' });
    mockedPrisma.message.create.mockResolvedValue({
      id: 'msg-1',
      content: 'hello',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      authorId: 'user-1',
      author: { email: 'user@example.com' },
    });

    const result = await chatService.saveMessage({
      roomName: 'general',
      content: 'hello',
      authorId: 'user-1',
    });

    expect(mockedPrisma.room.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: 'general' } }),
    );
    expect(result).toEqual({
      id: 'msg-1',
      content: 'hello',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      authorId: 'user-1',
      authorEmail: 'user@example.com',
      roomName: 'general',
    });
  });
});

describe('chatService.getRecentMessages', () => {
  it('returns an empty array when the room does not exist', async () => {
    mockedPrisma.room.findUnique.mockResolvedValue(null);

    const result = await chatService.getRecentMessages('nonexistent-room');

    expect(result).toEqual([]);
    expect(mockedPrisma.message.findMany).not.toHaveBeenCalled();
  });

  it('returns messages in chronological order (oldest first)', async () => {
    mockedPrisma.room.findUnique.mockResolvedValue({ id: 'room-1', name: 'general' });
    mockedPrisma.message.findMany.mockResolvedValue([
      {
        id: 'msg-2',
        content: 'second',
        createdAt: new Date('2026-01-01T00:01:00Z'),
        authorId: 'user-1',
        author: { email: 'user@example.com' },
      },
      {
        id: 'msg-1',
        content: 'first',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        authorId: 'user-1',
        author: { email: 'user@example.com' },
      },
    ]);

    const result = await chatService.getRecentMessages('general');

    expect(result.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });
});
