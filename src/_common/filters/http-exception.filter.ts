import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus} from "@nestjs/common";
import { Request, Response } from "express";


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): any {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        if ( exception instanceof HttpException ) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse()

            const errorBody =
                typeof exceptionResponse === "string"
                    ? { message: exceptionResponse }
                    : exceptionResponse as { message?: string };


            response.status(status).json({
                success: false,
                statusCode: status,
                ...errorBody ,
                message: errorBody.message || "something went wrong",
                path: request.url,
                timestamp: new Date().toISOString(),
            });
            return
        }

        console.log( 'Unexpected exception occurred.' , exception);

        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message:  "something went wrong , pls try later",
            errorCode : 'INTERNAL_SERVER_ERROR' ,
            path: request.url,
            timestamp: new Date().toISOString(),
        });

    }
}