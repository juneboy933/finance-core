import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class InitiateSTKDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber!: string;

  @IsNumber()
  @Min(1, { message: 'Minimum amount should be 1' })
  amount!: number;
}
