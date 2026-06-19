-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "confirmationEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationEmailError" TEXT,
ADD COLUMN     "credentialsEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "credentialsEmailError" TEXT;
