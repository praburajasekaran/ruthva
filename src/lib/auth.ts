import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "Ruthva <noreply@ruthva.com>",
      generateVerificationToken() {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        return code;
      },
      maxAge: 600, // 10 minutes
      async sendVerificationRequest({ identifier: email, token }) {
        const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
        const ses = new SESClient({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });
        await ses.send(new SendEmailCommand({
          Source: "Ruthva <noreply@ruthva.com>",
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: "Your Ruthva login code", Charset: "UTF-8" },
            Body: {
              Html: {
                Charset: "UTF-8",
                Data: `
                  <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
                    <h2 style="color: #16a34a; margin-bottom: 8px;">Ruthva</h2>
                    <p style="color: #6b7280; margin-bottom: 24px;">Treatment Continuity for Ayurveda</p>
                    <p style="margin-bottom: 16px;">Your login code is:</p>
                    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f0fdf4; border-radius: 8px; margin-bottom: 16px;">${token}</p>
                    <p style="color: #9ca3af; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
                  </div>
                `,
              },
            },
          },
        }));
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await db.user.findUnique({
        where: { email: user.email },
        select: { deactivatedAt: true },
      });
      if (dbUser?.deactivatedAt) return false;
      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
