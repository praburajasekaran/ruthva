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
        const { Resend: ResendClient } = await import("resend");
        const resend = new ResendClient(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Ruthva <noreply@ruthva.com>",
          to: email,
          subject: "Your Ruthva login code",
          html: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #16a34a; margin-bottom: 8px;">Ruthva</h2>
              <p style="color: #6b7280; margin-bottom: 24px;">Treatment Continuity for Ayurveda</p>
              <p style="margin-bottom: 16px;">Your login code is:</p>
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f0fdf4; border-radius: 8px; margin-bottom: 16px;">${token}</p>
              <p style="color: #9ca3af; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
