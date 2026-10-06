-- Подтверждение почты кодом из письма: счётчик неверных попыток.
ALTER TABLE "email_tokens" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
