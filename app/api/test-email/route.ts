import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

export async function GET() {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is not configured' },
      { status: 500 }
    )
  }

  const testRecipient = process.env.CONTACT_EMAIL || 'test@example.com'

  try {
    const data = await sendEmail({
      to: testRecipient,
      subject: 'Test Email - SD Dumping Solutions',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Test Email</h1>
          <p>This is a test email sent via Resend from SD Dumping Solutions.</p>
          <p>If you're seeing this, your email configuration is working correctly!</p>
          <p style="color: #6b7280; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testRecipient}`,
      data,
    })
  } catch (error) {
    console.error('Test email failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
