-- CreateTable
CREATE TABLE "SsoToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SsoToken_token_key" ON "SsoToken"("token");

-- CreateIndex
CREATE INDEX "SsoToken_token_idx" ON "SsoToken"("token");

-- CreateIndex
CREATE INDEX "SsoToken_expiresAt_idx" ON "SsoToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "SsoToken" ADD CONSTRAINT "SsoToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
