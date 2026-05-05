import { injectable } from 'inversify';
import { Response, Request } from 'express';
import HttpStatus from 'http-status-codes';
import _ from 'lodash';
import { Query, DuplicateModelError, ModelNotFoundError } from '@app/data/base';
import { ControllerError, InternalServerError } from '.';
import logger from '@app/common/services/logger/logger';
import { IrisAPIError } from '@random-guys/iris';
import axios, { AxiosError } from 'axios';
import MetricsService from '@app/server/services/metrics/metrics.service';

type PaginationOptions = Pick<
  Query,
  Exclude<keyof Query, 'conditions' | 'archived'>
>;

@injectable()
export class BaseController {
  /*
   * Determines the HTTP status code of an error
   * @param err Error object
   */
  getHTTPErrorCode(err) {
    // check if error code exists and is a valid HTTP code.
    if (err.code >= 100 && err.code < 500) return err.code;

    if (err instanceof ModelNotFoundError) return HttpStatus.NOT_FOUND;
    if (err instanceof DuplicateModelError)
      return HttpStatus.INTERNAL_SERVER_ERROR;
    if (axios.isAxiosError(err) && err.response)
      return err.response.status <= 500
        ? err.response.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Handles operation success and sends a HTTP response
   * @param req Express request
   * @param res Express response
   * @param data Success data
   */
  handleSuccess(req: Request, res: Response, data: any) {
    res.jSend.success(data);
    logger.logAPIResponse(req, res);
    res.getHeader('X-Response-Time') && MetricsService.record(req, res);
  }

  /**
   * Handles operation to download a file
   * @param req Express request
   * @param res Express response
   * @param writeStream Stream data
   */
  async handleFileResponse(
    req: Request,
    res: Response,
    writeStream: (res: Response) => Promise<void>
  ) {
    try {
      await writeStream(res);
      // Response is streaming, wait for finish to log metrics
      res.on('finish', () => {
        logger.logAPIResponse(req, res);
        if (res.getHeader('X-Response-Time')) {
          MetricsService.record(req, res);
        }
      });
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  /**
   * Handles operation error, sends a HTTP response and logs the error.
   * @param req Express request
   * @param res Express response
   * @param error Error object
   * @param message Optional error message. Useful for hiding internal errors from clients.
   */
  handleError(
    req: Request,
    res: Response,
    err: Error | IrisAPIError | AxiosError,
    message?: string
  ) {
    /**
     * Useful when we call an asynchrous function that might throw
     * after we've sent a response to client
     */
    if (res.headersSent) return logger.error(err);

    const { error_code } = <ControllerError>err;

    const irisErrormessage =
      err instanceof IrisAPIError && err.data.message
        ? err.data.message
        : undefined;

    const axiosErrorMessage =
      axios.isAxiosError(err) && err.response
        ? err.response.data.message
        : undefined;
    const axiosErrorCode =
      axios.isAxiosError(err) && err.response
        ? err.response.data.error_code
        : undefined;

    let errorMessage: string;

    if (message) {
      errorMessage = message;
    } else if (err instanceof InternalServerError) {
      errorMessage = err.message;
    } else if (this.getHTTPErrorCode(err) < 500) {
      errorMessage =
        axiosErrorMessage ||
        irisErrormessage ||
        err.message ||
        'We had issues on our end processing your request, please try again shortly. If issue persists, please contact our support team';
    } else {
      errorMessage =
        'We had issues on our end processing your request, please try again shortly. If issue persists, please contact our support team';
    }

    res.jSend.error(
      null,
      errorMessage,
      this.getHTTPErrorCode(err),
      error_code || axiosErrorCode
    );
    logger.logAPIError(req, res, err);
    res.getHeader('X-Response-Time') && MetricsService.record(req, res);
  }

  getPaginationOptions(query: any): PaginationOptions {
    return _.pick(query, ['page', 'per_page', 'projections', 'sort']);
  }
}
