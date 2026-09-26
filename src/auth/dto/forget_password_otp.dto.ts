import { IsEmail, IsString, Length } from 'class-validator';

export class ForgetPasswordOtpDto {
  @IsEmail()
  email: string;
}

export class ConfirmForgetPasswordOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
