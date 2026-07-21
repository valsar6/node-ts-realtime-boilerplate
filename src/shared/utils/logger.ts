import winston from 'winston';
import { env, Env } from '../../config/env';

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${String(timestamp)} [${level}] ${String(stack ?? message)}${metaString}`;
  }),
);

function selectFormat(nodeEnv: Env['NODE_ENV']): winston.Logform.Format {
  return nodeEnv === 'production' ? productionFormat : developmentFormat;
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: selectFormat(env.NODE_ENV),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});
