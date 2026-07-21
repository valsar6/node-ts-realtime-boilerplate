import { Namespace, Server as SocketServer } from 'socket.io';
import { AuthedSocket, socketAuthMiddleware } from '../../shared/socket/socketAuth';
import { CONSTANTS } from '../../config/constants';
import { logger } from '../../shared/utils/logger';
import { chatService } from './service';
import { joinRoomSchema, sendMessageSchema } from './schemas';

type Ack = (response: { ok: true; [key: string]: unknown } | { ok: false; error: string }) => void;

async function handleRoomJoin(socket: AuthedSocket, payload: unknown, ack?: Ack): Promise<void> {
  try {
    const { roomName } = joinRoomSchema.parse(payload);
    await socket.join(roomName);

    const history = await chatService.getRecentMessages(roomName);
    ack?.({ ok: true, history });

    socket.to(roomName).emit('room:user_joined', {
      userId: socket.data.user.sub,
      email: socket.data.user.email,
      roomName,
    });
  } catch (err) {
    ack?.({ ok: false, error: (err as Error).message });
  }
}

async function handleRoomLeave(socket: AuthedSocket, payload: unknown, ack?: Ack): Promise<void> {
  try {
    const { roomName } = joinRoomSchema.parse(payload);
    await socket.leave(roomName);
    ack?.({ ok: true });
  } catch (err) {
    ack?.({ ok: false, error: (err as Error).message });
  }
}

async function handleMessageSend(
  chatNamespace: Namespace,
  socket: AuthedSocket,
  payload: unknown,
  ack?: Ack,
): Promise<void> {
  try {
    const input = sendMessageSchema.parse(payload);

    if (!socket.rooms.has(input.roomName)) {
      throw new Error('You must join the room before sending messages');
    }

    const message = await chatService.saveMessage({
      roomName: input.roomName,
      content: input.content,
      authorId: socket.data.user.sub,
    });

    chatNamespace.to(input.roomName).emit('message:new', message);
    ack?.({ ok: true });
  } catch (err) {
    ack?.({ ok: false, error: (err as Error).message });
  }
}

function registerConnectionHandlers(chatNamespace: Namespace, socket: AuthedSocket): void {
  const { sub: userId } = socket.data.user;

  socket.on('room:join', (payload: unknown, ack?: Ack) => handleRoomJoin(socket, payload, ack));
  socket.on('room:leave', (payload: unknown, ack?: Ack) => handleRoomLeave(socket, payload, ack));
  socket.on('message:send', (payload: unknown, ack?: Ack) =>
    handleMessageSend(chatNamespace, socket, payload, ack),
  );

  socket.on('disconnect', (reason: string) => {
    logger.info('Socket disconnected', {
      namespace: CONSTANTS.SOCKET_NAMESPACE_CHAT,
      userId,
      reason,
    });
  });
}

export function registerChatNamespace(io: SocketServer): void {
  const chatNamespace = io.of(CONSTANTS.SOCKET_NAMESPACE_CHAT);
  chatNamespace.use(socketAuthMiddleware);

  chatNamespace.on('connection', (socket: AuthedSocket) => {
    logger.info('Socket connected', {
      namespace: CONSTANTS.SOCKET_NAMESPACE_CHAT,
      userId: socket.data.user.sub,
    });
    registerConnectionHandlers(chatNamespace, socket);
  });
}
