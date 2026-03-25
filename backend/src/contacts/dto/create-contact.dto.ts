import { IsString, IsOptional, IsEnum, IsDateString, IsEmail, IsUrl, MaxLength } from 'class-validator';
import { ContactRole } from '@prisma/client';

export class CreateContactDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'linkedIn must be a valid URL' })
  linkedIn?: string;

  @IsOptional()
  @IsEnum(ContactRole)
  role?: ContactRole;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsDateString()
  lastContactedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
