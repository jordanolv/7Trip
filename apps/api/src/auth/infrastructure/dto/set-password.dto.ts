import { IsNotEmpty, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
