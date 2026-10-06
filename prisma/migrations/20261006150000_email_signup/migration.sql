-- Регистрация по почте: одноразовые ссылки подтверждения и сброса пароля.
CREATE TYPE "EmailTokenPurpose" AS ENUM ('VERIFY', 'RESET');

CREATE TABLE "email_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "EmailTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_tokens_tokenHash_key" ON "email_tokens"("tokenHash");
CREATE INDEX "email_tokens_userId_purpose_idx" ON "email_tokens"("userId", "purpose");

ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Теперь вход по паролю требует подтверждённой почты. Пароли, заведённые
-- до этого (вручную и сидом), выдавал администратор — считаем их
-- подтверждёнными, иначе их владельцы потеряли бы вход.
UPDATE "users" SET "emailVerified" = true WHERE "passwordHash" IS NOT NULL AND "emailVerified" = false;
