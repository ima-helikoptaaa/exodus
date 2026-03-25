import { PartialType } from '@nestjs/mapped-types';
import { CreatePrepTopicDto } from './create-prep-topic.dto.js';

export class UpdatePrepTopicDto extends PartialType(CreatePrepTopicDto) {}
