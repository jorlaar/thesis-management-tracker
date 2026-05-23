import { Job } from 'bullmq';
import logger from '@app/common/services/logger';

export async function OnboardMethod(job: Job) {
  try {
    logger.message('>>>>>>> data');
  } catch (error) {
    logger.error(error, '>>>>>>> data');
  }
}
