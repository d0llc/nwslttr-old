import { Theme } from 'next-auth'

export const customEmailTemplate = {
  subject: ({ host }: { host: string }) => `Sign in to ${host}`,
  text: ({ url, host }: { url: string; host: string }) => {
    return `Sign in to ${host}\n\n${url}\n\n`
  },
  html: ({ url, host, theme }: { url: string; host: string; theme: Theme }) => {
    const escapedHost = host.replace(/\./g, '&#8203;.')
    const brandColor = theme.brandColor || '#346df1'
    const color = {
      background: '#f9f9f9',
      text: '#444',
      mainBackground: '#fff',
      buttonBackground: brandColor,
      buttonBorder: brandColor,
      buttonText: theme.buttonText || '#fff',
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Sign in to ${escapedHost}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .inner-body {
        width: 100% !important;
      }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: ${color.background}; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${color.background};">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table class="inner-body" role="presentation" width="570" cellpadding="0" cellspacing="0" style="background-color: ${color.mainBackground}; border-radius: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 35px 35px 20px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${color.text};">
                nwslttr.io
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 35px 30px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: ${color.text};">
                Sign in to your account
              </h2>
              
              <p style="margin: 0 0 25px; font-size: 16px; line-height: 24px; color: ${color.text};">
                Click the button below to sign in to your nwslttr.io account. This link will expire in 24 hours.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 30px; font-size: 16px; font-weight: 600; color: ${color.buttonText}; background-color: ${color.buttonBackground}; text-decoration: none; border-radius: 5px;">
                      Sign in
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0; font-size: 14px; line-height: 20px; color: #666;">
                If you didn't request this email, you can safely ignore it.
              </p>
              
              <!-- Alternative Link -->
              <p style="margin: 20px 0 0; font-size: 12px; line-height: 18px; color: #999;">
                Or copy and paste this URL into your browser:<br>
                <a href="${url}" target="_blank" style="color: #999; text-decoration: underline; word-break: break-all;">
                  ${url}
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 35px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #999; text-align: center;">
                © ${new Date().getFullYear()} nwslttr.io. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },
}

export const verificationRequestTemplate = {
  subject: 'Welcome to nwslttr.io - Verify your email',
  text: ({ url }: { url: string }) => {
    return `Welcome to nwslttr.io!\n\nPlease verify your email by clicking the link below:\n\n${url}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`
  },
  html: ({ url }: { url: string }) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Welcome to nwslttr.io</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" width="570" cellpadding="0" cellspacing="0" style="background-color: #fff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 35px 35px 20px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #333;">
                Welcome to nwslttr.io! 🎉
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 35px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #444;">
                Thanks for signing up! We're excited to help you track and analyze your newsletter links.
              </p>
              
              <p style="margin: 0 0 25px; font-size: 16px; line-height: 24px; color: #444;">
                Please verify your email address by clicking the button below:
              </p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 30px; font-size: 16px; font-weight: 600; color: #fff; background-color: #4f46e5; text-decoration: none; border-radius: 5px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0; font-size: 14px; line-height: 20px; color: #666;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },
}
