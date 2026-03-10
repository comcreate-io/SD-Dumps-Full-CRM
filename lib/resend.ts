import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type EmailOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  cc?: string | string[]
  replyTo?: string
}

export async function sendEmail(options: EmailOptions) {
  const from = process.env.EMAIL_FROM || 'SD Dumping Solutions <noreply@sddumpingsolutions.com>'

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
    cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
    replyTo: options.replyTo,
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return data
}
