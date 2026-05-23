import { Job } from 'bullmq';
import logger from '@app/common/services/logger/logger';

export const SendNotification = async (job: Job) => {
  logger.message(`Sending login message for job ${job.id}`);
  // Send email/SMS, etc.
};
