import { ValidationError } from '@nestjs/common';


export function formatDtoException(error: ValidationError): any {

  const message = error.constraints
    ? Object.values(error.constraints)
    : [];


  return {
    field: error.property as string,
    value: error.value as string,
    message: message,
    errorCode: error?.contexts?.matches?.errorCode ?? '',
  };


}
// : { [ type:string ] :string  }