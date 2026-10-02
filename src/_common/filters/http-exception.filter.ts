import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus} from "@nestjs/common";
import { Request, Response } from "express";
import { QueryFailedError } from 'typeorm';
import { DatabaseError } from 'pg-protocol';


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): any {

      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
      let returnObj = { statusCode :400 };

      if (exception instanceof HttpException) {
        returnObj = handleHttpException(exception);
      } else if (exception instanceof QueryFailedError) {
        returnObj = handleQueryException(exception);
      } else {
        returnObj = handleUnknowException();
      }

      response.status(returnObj.statusCode ).json({
          path: request.url,
          success: false,
          ...returnObj,
          timestamp: new Date().toISOString(),
          // errorCode
          // message
      });
    }
}

function handleHttpException(exception :HttpException) {
  const status = exception.getStatus();
  const exceptionResponse = exception.getResponse();

  const errorBody =
    typeof exceptionResponse === 'string'
    ? { message: exceptionResponse }
    : (exceptionResponse as { message?: string });

      return {
        statusCode: status,
        ...errorBody, //  include errorCode
      }
}

function handleQueryException(exception: QueryFailedError) {
  const pgError = exception.driverError as DatabaseError;
  const match = pgError.detail?.match(/\((\w+)\)=/);
  const field = match?.[1] ?? 'field';

  switch (pgError.code) {
    case '23505': {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: `${field} already exists`,
        errorCode : 'duplicated_info',
      };
    }
    case '23503':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `${field} record does not exist`,
        errorCode: 'field_not_exists',
      };
    case '23502':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `${field} is required`,
        errorCode: 'missing_field',

      };

    default:
      return handleUnknowException();
  }
}

function handleUnknowException() {
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: 'something went wrong , pls try later',
  };
}