import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { TagsModule } from './tags/tags.module.js';
import { NotesModule } from './notes/notes.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    PrismaModule,
    CompaniesModule,
    ApplicationsModule,
    InterviewsModule,
    ContactsModule,
    TagsModule,
    NotesModule,
    DashboardModule,
  ],
})
export class AppModule {}
