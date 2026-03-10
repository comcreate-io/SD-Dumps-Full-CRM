import { NextRequest, NextResponse } from 'next/server'
import { sendContactFormEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Contact form API called')
    const data = await request.json()
    console.log('📋 Contact form data received:', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      hasAllFields: !!(data.firstName && data.lastName && data.email && data.message)
    })

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.email || !data.message) {
      console.error('❌ Missing required fields:', {
        hasFirstName: !!data.firstName,
        hasLastName: !!data.lastName,
        hasEmail: !!data.email,
        hasMessage: !!data.message
      })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Send email
    console.log('📧 Calling sendContactFormEmail function...')
    const result = await sendContactFormEmail({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      service: data.service,
      message: data.message,
    })

    if (result.skipped) {
      console.log('⚠️ Email skipped:', result.reason)
      return NextResponse.json({
        success: true,
        skipped: true,
        message: result.reason || 'Email not configured'
      })
    }

    console.log('✅ Contact form email sent successfully!')
    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully! We\'ll get back to you soon.',
    })
  } catch (error) {
    console.error('❌ Error in contact form API:', error)

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    // Return detailed error for debugging
    return NextResponse.json(
      {
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error',
        emailConfigured: !!process.env.RESEND_API_KEY
      },
      { status: 500 }
    )
  }
}
