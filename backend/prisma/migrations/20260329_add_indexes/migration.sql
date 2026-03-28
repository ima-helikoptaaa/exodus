-- CreateIndex
CREATE INDEX "applications_appliedDate_idx" ON "applications"("appliedDate");

-- CreateIndex
CREATE INDEX "applications_followUpDate_idx" ON "applications"("followUpDate");

-- CreateIndex
CREATE INDEX "interview_rounds_status_idx" ON "interview_rounds"("status");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
