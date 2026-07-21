import { createServer } from 'http';
import { createApp } from './app';
import { createSocketServer } from './shared/socket';
import { env } from './config/env';
import { logger } from './shared/utils/logger';
import { prisma } from './shared/utils/prisma';

const app = createApp();
const httpServer = createServer(app);
createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`, { env: env.NODE_ENV });
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});
