import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';

export enum TripStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

export class CreateTripDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;
}
