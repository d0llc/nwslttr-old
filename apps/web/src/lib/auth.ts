import { NextAuthOptions, getServerSession } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { authAdapter } from '@repo/db'
import { createTransport } from 'nodemailer'
import { customEmailTemplate } from './email-templates'

// Create email transporter
const transporter = createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT || 587),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

export const authOptions: NextAuthOptions = {
  adapter: authAdapter,
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM || 'noreply@nwslttr.io',
      sendVerificationRequest: async ({ identifier: email, url, theme }) => {
        const { host } = new URL(url)
        await transporter.sendMail({
          to: email,
          from: process.env.EMAIL_FROM || 'noreply@nwslttr.io',
          subject: customEmailTemplate.subject({ host }),
          text: customEmailTemplate.text({ url, host }),
          html: customEmailTemplate.html({ url, host, theme }),
        })
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id as string
      }
      return session
    },
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

export async function auth() {
  return await getServerSession(authOptions)
}
