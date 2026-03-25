import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './create-contact.dto.js';

export class UpdateContactDto extends PartialType(CreateContactDto) {}
