import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'info',
  format: format.prettyPrint(),
  transports: [
    new transports.Console({
      format: format.simple(),
    }),
  ],
});
