import { sendEmail } from '@/lib/resend'

// Check if Resend is configured
const isEmailConfigured = !!process.env.RESEND_API_KEY

if (isEmailConfigured) {
  console.log('📧 Email configured with Resend API')
} else {
  console.warn('⚠️ Email not configured - RESEND_API_KEY missing, emails will be skipped')
}

// Pricing breakdown interface
interface PricingBreakdown {
  containerType: string
  basePrice: number
  includedDays: number
  totalDays: number
  extraDays: number
  extraDaysAmount: number
  extraTonnage: number
  extraTonnageAmount: number
  applianceCount: number
  applianceAmount: number
  distanceMiles: number | null
  distanceFee: number
  travelFee: number
  priceAdjustment: number
  adjustmentReason: string | null
  total: number
}

interface BookingEmailData {
  bookingId: string
  customerName: string
  customerEmail: string
  containerType: string
  startDate: string
  endDate: string
  serviceType: string
  totalAmount: number
  deliveryAddress?: string
  pickupTime?: string
  notes?: string
  pricingBreakdown?: PricingBreakdown | null
}

interface GuestInquiryEmailData {
  customerName: string
  customerEmail: string
  phone?: string | null
  containerType: string
  startDate: string
  endDate: string
  serviceType: string
  deliveryAddress?: string | null
  notes?: string | null
}

interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  service?: string
  message: string
}

// Helper: build a single table row for detail sections (email-safe, no flexbox)
function detailRow(label: string, value: string, valueStyle?: string): string {
  return `<tr>
    <td style="padding: 10px 8px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #f3f4f6; width: 45%;">${label}</td>
    <td style="padding: 10px 8px; color: #111827; border-bottom: 1px solid #f3f4f6; text-align: right;${valueStyle ? ' ' + valueStyle : ''}">${value}</td>
  </tr>`
}

// Helper function to generate pricing breakdown HTML
function generatePricingBreakdownHtml(breakdown: PricingBreakdown | null | undefined): string {
  if (!breakdown) return ''

  const rows: string[] = []

  rows.push(detailRow(`Base Price (${breakdown.includedDays} days included)`, `$${breakdown.basePrice.toFixed(2)}`))

  if (breakdown.extraDays > 0) {
    rows.push(detailRow(`Extra Days (${breakdown.extraDays} x $25)`, `$${breakdown.extraDaysAmount.toFixed(2)}`))
  }

  if (breakdown.extraTonnage > 0) {
    rows.push(detailRow(`Extra Tonnage (${breakdown.extraTonnage} x $125)`, `$${breakdown.extraTonnageAmount.toFixed(2)}`))
  }

  if (breakdown.applianceCount > 0) {
    rows.push(detailRow(`Appliances (${breakdown.applianceCount} x $25)`, `$${breakdown.applianceAmount.toFixed(2)}`))
  }

  if (breakdown.distanceFee > 0) {
    const milesText = breakdown.distanceMiles ? ` (${breakdown.distanceMiles.toFixed(1)} mi)` : ''
    rows.push(detailRow(`Distance Fee${milesText}`, `$${breakdown.distanceFee.toFixed(2)}`))
  }

  if (breakdown.travelFee > 0) {
    rows.push(detailRow('Travel Fee', `$${breakdown.travelFee.toFixed(2)}`))
  }

  if (breakdown.priceAdjustment !== 0) {
    const adjustLabel = breakdown.priceAdjustment < 0 ? 'Discount' : 'Additional Charge'
    const reasonText = breakdown.adjustmentReason ? ` (${breakdown.adjustmentReason})` : ''
    const color = breakdown.priceAdjustment < 0 ? '#059669' : '#dc2626'
    const sign = breakdown.priceAdjustment < 0 ? '-' : '+'
    rows.push(detailRow(`${adjustLabel}${reasonText}`, `${sign}$${Math.abs(breakdown.priceAdjustment).toFixed(2)}`, `color: ${color};`))
  }

  if (rows.length === 0) return ''

  return `
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #2563eb; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Pricing Breakdown</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        ${rows.join('\n')}
        <tr>
          <td style="padding: 12px 8px; font-weight: bold; color: #111827; border-top: 2px solid #e5e7eb; font-size: 16px;">Total</td>
          <td style="padding: 12px 8px; font-weight: bold; color: #059669; border-top: 2px solid #e5e7eb; font-size: 16px; text-align: right;">$${breakdown.total.toFixed(2)}</td>
        </tr>
      </table>
    </div>
  `
}

function generateGuestInquiryEmail(data: GuestInquiryEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="https://res.cloudinary.com/dku1gnuat/image/upload/f_auto,q_auto/sddumps/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h2 style="margin: 0;">New Guest Booking Request</h2>
              <p style="margin: 6px 0 0 0">No account - follow-up required</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Name', data.customerName)}
                  ${detailRow('Email', data.customerEmail)}
                  ${data.phone ? detailRow('Phone', data.phone) : ''}
                </table>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Container', data.containerType)}
                  ${detailRow('Service', data.serviceType.charAt(0).toUpperCase() + data.serviceType.slice(1))}
                  ${detailRow('Start', data.startDate)}
                  ${detailRow('End', data.endDate)}
                  ${data.deliveryAddress ? detailRow('Delivery Address', data.deliveryAddress) : ''}
                </table>
              </div>
              ${data.notes ? `<div style="background: white; padding: 20px; border-radius: 8px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08);"><p style="margin: 0 0 8px 0; font-weight: bold; color: #6b7280;">Notes</p><p style="margin: 0; color: #111827;">${data.notes}</p></div>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export async function sendGuestInquiryEmail(data: GuestInquiryEmailData) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping guest inquiry email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  await sendEmail({
    to: process.env.CONTACT_EMAIL!,
    subject: `New Guest Booking Request`,
    html: generateGuestInquiryEmail(data),
    replyTo: data.customerEmail,
  })

  return { success: true }
}

// Contact form email template
function generateContactFormEmail(data: ContactFormData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h2 style="margin: 0;">New Contact Form Submission</h2>
              <p style="margin: 6px 0 0 0">From your website contact page</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Name', data.firstName + ' ' + data.lastName)}
                  ${detailRow('Email', data.email)}
                  ${data.phone ? detailRow('Phone', data.phone) : ''}
                  ${data.service ? detailRow('Service Type', data.service) : ''}
                </table>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #6b7280;">Message</p>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; color: #111827;">${data.message}</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// Send contact form email
export async function sendContactFormEmail(data: ContactFormData) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping contact form email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  await sendEmail({
    to: process.env.CONTACT_EMAIL!,
    subject: `New Contact Form Submission from ${data.firstName} ${data.lastName}`,
    html: generateContactFormEmail(data),
    replyTo: data.email,
  })

  return { success: true }
}

// Client email template
export function generateClientEmail(data: BookingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">Booking Confirmed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your order</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; margin-top: 0;">Hi <strong>${data.customerName}</strong>,</p>
              <p>Your container rental has been successfully booked! Here are your booking details:</p>

              <!-- Booking Information Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Booking Information</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Booking ID', '#' + data.bookingId.slice(0, 8))}
                  ${detailRow('Container Type', data.containerType)}
                  ${detailRow('Service Type', data.serviceType.charAt(0).toUpperCase() + data.serviceType.slice(1))}
                  ${data.pickupTime ? detailRow('Preferred Time', data.pickupTime) : ''}
                </table>
              </div>

              <!-- Rental Period Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Rental Period</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Start Date', data.startDate)}
                  ${detailRow('End Date', data.endDate)}
                  ${data.deliveryAddress ? detailRow('Delivery Address', data.deliveryAddress) : ''}
                </table>
              </div>

              ${data.notes ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Additional Notes</h2>
                <p style="margin: 0; color: #4b5563;">${data.notes}</p>
              </div>
              ` : ''}

              ${generatePricingBreakdownHtml(data.pricingBreakdown)}

              <!-- Total -->
              <div style="background: #eff6ff; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; color: #2563eb; text-align: center; margin: 20px 0;">
                Total Amount: $${data.totalAmount.toFixed(2)}
              </div>

              <!-- What's Next -->
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>What's Next?</strong></p>
                <p style="margin: 10px 0 0 0; color: #92400e;">
                  Our team will contact you 24 hours before your scheduled ${data.serviceType === 'delivery' ? 'delivery' : 'pickup'} date to confirm the details.
                </p>
              </div>

              <!-- Button -->
              <p style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.sddumpingsolutions.com'}/bookings" style="display: inline-block; background: #059669; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">View My Bookings</a>
              </p>

              <p style="color: #6b7280; font-size: 14px;">
                If you have any questions or need to make changes to your booking, please don't hesitate to contact us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions</strong></p>
              <p>Professional Waste Management Services</p>
              <p style="margin: 10px 0;">
                ${process.env.EMAIL_FROM} | Contact Us
              </p>
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated message. Please do not reply directly to this email.
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
}

// Admin email template
export function generateAdminEmail(data: BookingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">New Booking Alert</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Action Required</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 0 0 20px 0; color: #991b1b;">
                <p style="margin: 0; font-weight: bold;">A new booking has been created and requires your attention.</p>
              </div>

              <!-- Booking Details Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Booking Details</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Booking ID', '#' + data.bookingId.slice(0, 8))}
                  ${detailRow('Status', 'CONFIRMED', 'color: #059669; font-weight: bold;')}
                  ${detailRow('Container Type', data.containerType)}
                  ${detailRow('Service Type', data.serviceType.charAt(0).toUpperCase() + data.serviceType.slice(1))}
                  ${detailRow('Total Amount', '$' + data.totalAmount.toFixed(2), 'color: #059669; font-weight: bold;')}
                </table>
              </div>

              <!-- Customer Info Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Customer Information</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Name', data.customerName)}
                  ${detailRow('Email', data.customerEmail)}
                </table>
              </div>

              <!-- Schedule Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Schedule</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Start Date', data.startDate)}
                  ${detailRow('End Date', data.endDate)}
                  ${data.pickupTime ? detailRow('Preferred Time', data.pickupTime) : ''}
                  ${data.deliveryAddress ? detailRow('Delivery Address', data.deliveryAddress) : ''}
                </table>
              </div>

              ${data.notes ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Customer Notes</h2>
                <p style="margin: 0; color: #4b5563; background: #f3f4f6; padding: 15px; border-radius: 6px;">${data.notes}</p>
              </div>
              ` : ''}

              ${generatePricingBreakdownHtml(data.pricingBreakdown)}

              <!-- Button -->
              <p style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.sddumpingsolutions.com'}/admin/bookings" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Manage Booking</a>
              </p>

              <!-- Action Items -->
              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af;"><strong>Action Items:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px; color: #1e40af;">
                  <li>Review booking details in the admin panel</li>
                  <li>Confirm container availability</li>
                  <li>Contact customer 24 hours before scheduled date</li>
                  <li>Prepare ${data.serviceType === 'delivery' ? 'delivery logistics' : 'pickup instructions'}</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions Admin Panel</strong></p>
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated notification from your booking system.
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
}

// Send booking confirmation emails
export async function sendBookingEmails(data: BookingEmailData) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping email notification')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  try {
    // Send email to client (with CC to admin emails)
    await sendEmail({
      to: data.customerEmail,
      cc: ['sandiegodumpingsolutions@gmail.com', 'diego@comcreate.org'],
      subject: `Booking Confirmed - Order #${data.bookingId.slice(0, 8)}`,
      html: generateClientEmail(data),
    })
    console.log('✅ Client email sent to:', data.customerEmail)

    // Send email to admin
    await sendEmail({
      to: process.env.CONTACT_EMAIL!,
      subject: `🔔 New Booking Alert - #${data.bookingId.slice(0, 8)}`,
      html: generateAdminEmail(data),
    })
    console.log('✅ Admin email sent to:', process.env.CONTACT_EMAIL)

    return { success: true }
  } catch (error) {
    console.error('❌ Error sending booking emails:', error)
    throw error
  }
}

// Phone Booking Email Templates
interface PhoneBookingEmailData {
  customerName: string
  customerEmail: string
  paymentLink: string
  containerType: string
  startDate: string
  endDate: string
  totalAmount: number
  expiresAt: string
  pricingBreakdown?: PricingBreakdown | null
}

// Customer email for phone booking
function generatePhoneBookingCustomerEmail(data: PhoneBookingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">Complete Your Booking</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">One More Step Required</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; margin-top: 0;">Hi <strong>${data.customerName}</strong>,</p>
              <p>Thank you for booking with SD Dumping Solutions! We've reserved a container for you. To complete your booking, please click the button below to review your booking details, sign the rental agreement, and securely save your payment information.</p>

              <!-- Booking Details Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Your Booking Details</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Container Type', data.containerType)}
                  ${detailRow('Start Date', data.startDate)}
                  ${detailRow('End Date', data.endDate)}
                  ${detailRow('Total Amount', '$' + data.totalAmount.toFixed(2), 'color: #059669; font-weight: bold;')}
                </table>
              </div>

              ${generatePricingBreakdownHtml(data.pricingBreakdown)}

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; color: #92400e;">
                <p style="margin: 0; font-weight: bold;">Important: Your card will NOT be charged yet!</p>
                <p style="margin: 10px 0 0 0;">
                  We only need to securely save your payment method. You'll be charged when your rental begins.
                </p>
              </div>

              <!-- Button -->
              <p style="text-align: center; margin: 30px 0;">
                <a href="${data.paymentLink}" style="display: inline-block; background: #059669; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Review & Sign Contract</a>
              </p>

              <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 20px 0; color: #991b1b;">
                <p style="margin: 0; font-weight: bold;">This link expires on ${data.expiresAt}</p>
                <p style="margin: 10px 0 0 0;">
                  Please complete your booking within 7 days. After that, this link will expire and your reservation will be cancelled.
                </p>
              </div>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">What You'll Need To Complete</h2>
                <ul style="margin: 10px 0; padding-left: 20px; color: #4b5563;">
                  <li>Review your booking details</li>
                  <li>Save a valid credit or debit card</li>
                  <li>Read and sign the rental agreement</li>
                </ul>
              </div>

              <p style="color: #6b7280; font-size: 14px;">
                If you have any questions or didn't request this booking, please contact us immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions</strong></p>
              <p>Professional Waste Management Services</p>
              <p style="margin: 10px 0;">
                ${process.env.EMAIL_FROM} | Contact Us
              </p>
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated message. Please do not reply directly to this email.
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
}

// Admin notification when customer completes payment link
function generatePhoneBookingCompletedEmail(data: {
  customerName: string
  customerEmail: string
  bookingId: string
  containerType: string
  totalAmount: number
  pricingBreakdown?: PricingBreakdown | null
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">Phone Booking Completed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Customer has saved their card</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <div style="background: #d1fae5; border-left: 4px solid #059669; padding: 15px; border-radius: 4px; margin: 0 0 20px 0; color: #065f46;">
                <p style="margin: 0; font-weight: bold;">Great news! The customer has completed their phone booking.</p>
                <p style="margin: 10px 0 0 0;">
                  Their payment method has been securely saved and the booking is ready to be charged.
                </p>
              </div>

              <!-- Booking Info Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #059669; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Booking Information</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Booking ID', '#' + data.bookingId.slice(0, 8))}
                  ${detailRow('Status', 'READY TO CHARGE', 'color: #059669; font-weight: bold;')}
                  ${detailRow('Container Type', data.containerType)}
                  ${detailRow('Total Amount', '$' + data.totalAmount.toFixed(2), 'color: #059669; font-weight: bold;')}
                </table>
              </div>

              <!-- Customer Info Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #059669; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Customer Information</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Name', data.customerName)}
                  ${detailRow('Email', data.customerEmail)}
                </table>
              </div>

              ${generatePricingBreakdownHtml(data.pricingBreakdown)}

              <!-- Button -->
              <p style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.sddumpingsolutions.com'}/admin/payments" style="display: inline-block; background: #059669; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Charge Customer Now</a>
              </p>

              <!-- Next Steps -->
              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af;"><strong>Next Steps:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px; color: #1e40af;">
                  <li>Go to the Payment Tracker in your admin dashboard</li>
                  <li>Find this booking in the "Pending" section</li>
                  <li>Click "Charge Customer" when ready</li>
                  <li>The saved card will be charged automatically</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions Admin Panel</strong></p>
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated notification from your booking system.
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
}

// Send phone booking payment link email
export async function sendPhoneBookingEmail(data: PhoneBookingEmailData) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping phone booking email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  try {
    await sendEmail({
      to: data.customerEmail,
      cc: ['sandiegodumpingsolutions@gmail.com', 'diego@comcreate.org'],
      subject: `Complete Your Booking - Action Required`,
      html: generatePhoneBookingCustomerEmail(data),
    })
    console.log('✅ Phone booking email sent to:', data.customerEmail)

    return { success: true }
  } catch (error) {
    console.error('❌ Error sending phone booking email:', error)
    throw error
  }
}

// Send notification to admin when phone booking is completed
export async function sendPhoneBookingCompletedEmail(data: {
  customerName: string
  customerEmail: string
  bookingId: string
  containerType: string
  totalAmount: number
  pricingBreakdown?: PricingBreakdown | null
}) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping phone booking completion email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  try {
    await sendEmail({
      to: process.env.CONTACT_EMAIL!,
      subject: `✅ Phone Booking Completed - #${data.bookingId.slice(0, 8)}`,
      html: generatePhoneBookingCompletedEmail(data),
    })
    console.log('✅ Phone booking completion email sent to admin')

    return { success: true }
  } catch (error) {
    console.error('❌ Error sending phone booking completion email:', error)
    throw error
  }
}

// Generate customer confirmation email HTML
function generateCustomerConfirmationEmail(data: {
  customerName: string
  bookingId: string
  containerType: string
  startDate: string
  endDate: string
  totalAmount: number
  pricingBreakdown?: PricingBreakdown | null
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">Booking Confirmed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Your payment information has been saved successfully</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <p>Hi ${data.customerName},</p>

              <div style="background: #d1fae5; border-left: 4px solid #059669; padding: 15px; border-radius: 4px; margin: 20px 0; color: #065f46;">
                <p style="margin: 0; font-weight: bold;">Your booking is confirmed!</p>
                <p style="margin: 10px 0 0 0;">
                  We've securely saved your payment information and your booking is all set.
                </p>
              </div>

              <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0; color: #1e40af;">
                <p style="margin: 0; font-weight: bold;">Important Notice</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Your card has been saved but NOT charged yet</strong></li>
                  <li>You'll be charged when your rental period begins</li>
                  <li>You'll receive a receipt via email when charged</li>
                  <li>Our team will contact you 24 hours before your scheduled date</li>
                </ul>
              </div>

              <!-- Booking Summary Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #059669; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Booking Summary</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Booking ID', '#' + data.bookingId.slice(0, 8).toUpperCase())}
                  ${detailRow('Container', data.containerType)}
                  ${detailRow('Start Date', data.startDate)}
                  ${detailRow('End Date', data.endDate)}
                  ${detailRow('Total Amount', '$' + data.totalAmount.toFixed(2), 'color: #059669; font-weight: bold;')}
                </table>
              </div>

              ${generatePricingBreakdownHtml(data.pricingBreakdown)}

              <p style="text-align: center; margin: 30px 0 10px 0; color: #6b7280;">
                Questions? Contact us anytime - we're here to help!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions</strong></p>
              <p style="font-size: 12px; color: #9ca3af;">
                Thank you for choosing SD Dumping Solutions for your container rental needs!
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
}

// Send confirmation email to customer after completing booking
export async function sendCustomerConfirmationEmail(data: {
  customerName: string
  customerEmail: string
  bookingId: string
  containerType: string
  startDate: string
  endDate: string
  totalAmount: number
  pricingBreakdown?: PricingBreakdown | null
}) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping customer confirmation email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  try {
    await sendEmail({
      to: data.customerEmail,
      cc: ['sandiegodumpingsolutions@gmail.com', 'diego@comcreate.org'],
      subject: `✅ Booking Confirmed - #${data.bookingId.slice(0, 8)}`,
      html: generateCustomerConfirmationEmail(data),
    })
    console.log('✅ Customer confirmation email sent to:', data.customerEmail)

    return { success: true }
  } catch (error) {
    console.error('❌ Error sending customer confirmation email:', error)
    throw error
  }
}

// Generate payment receipt email HTML
function generatePaymentReceiptEmail(data: {
  customerName: string
  bookingId: string
  amount: number
  description: string
  transactionId: string
  chargedDate: string
  pricingBreakdown?: PricingBreakdown | null
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">Payment Receipt</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Your payment has been processed</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <p>Hi ${data.customerName},</p>

              <!-- Amount Box -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">Amount Charged</p>
                <p style="margin: 10px 0; font-size: 36px; font-weight: bold;">$${data.amount.toFixed(2)}</p>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">Payment Successful</p>
              </div>

              <!-- Payment Details Card -->
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Payment Details</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Booking ID', '#' + data.bookingId.slice(0, 8).toUpperCase())}
                  ${detailRow('Description', data.description)}
                  ${detailRow('Date', data.chargedDate)}
                  <tr>
                    <td style="padding: 10px 8px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #f3f4f6; width: 45%;">Transaction ID</td>
                    <td style="padding: 10px 8px; color: #111827; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 11px; font-family: monospace;">${data.transactionId}</td>
                  </tr>
                </table>
              </div>

              ${generatePricingBreakdownHtml(data.pricingBreakdown)}

              <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0; color: #1e40af;">
                <p style="margin: 0; font-weight: bold;">Receipt Confirmation</p>
                <p style="margin: 10px 0 0 0;">
                  This email serves as your receipt. Please save it for your records. If you have any questions about this charge, please contact us.
                </p>
              </div>

              <p style="text-align: center; margin: 30px 0 10px 0; color: #6b7280;">
                Thank you for your business!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions</strong></p>
              <p style="font-size: 12px; color: #9ca3af;">
                Container Rental Services
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
}

// Send cancellation email to customer
export async function sendCancellationEmail(data: {
  customerName: string
  customerEmail: string
  bookingId: string
  containerType: string
  startDate: string
  endDate: string
  reason?: string
}) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping cancellation email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  try {
    await sendEmail({
      to: data.customerEmail,
      cc: ['sandiegodumpingsolutions@gmail.com', 'diego@comcreate.org'],
      subject: `Booking Cancelled - #${data.bookingId.slice(0, 8)}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">Booking Cancelled</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <p>Hi ${data.customerName},</p>
              <p>Your booking has been cancelled. Here are the details:</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Booking Details</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Booking ID', '#' + data.bookingId.slice(0, 8))}
                  ${detailRow('Container', data.containerType)}
                  ${detailRow('Start Date', data.startDate)}
                  ${detailRow('End Date', data.endDate)}
                  ${data.reason ? detailRow('Reason', data.reason) : ''}
                </table>
              </div>
              <p style="color: #6b7280;">If you have any questions about this cancellation, please don't hesitate to contact us.</p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions</strong></p>
              <p style="font-size: 12px; color: #9ca3af;">Container Rental Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })
    console.log('✅ Cancellation email sent to:', data.customerEmail)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending cancellation email:', error)
    throw error
  }
}

// Send booking extension email to customer
export async function sendBookingExtensionEmail(data: {
  customerName: string
  customerEmail: string
  bookingId: string
  containerType: string
  startDate: string
  previousEndDate: string
  newEndDate: string
  additionalDays: number
  additionalCost: number
  newTotalAmount: number
}) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping extension email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  try {
    await sendEmail({
      to: data.customerEmail,
      cc: ['sandiegodumpingsolutions@gmail.com', 'diego@comcreate.org'],
      subject: `Booking Extended - #${data.bookingId.slice(0, 8)}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">Booking Extended</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Your rental period has been updated</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <p>Hi ${data.customerName},</p>
              <p>Your booking has been extended. Here are the updated details:</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Booking Details</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${detailRow('Booking ID', '#' + data.bookingId.slice(0, 8))}
                  ${detailRow('Container', data.containerType)}
                  ${detailRow('Start Date', data.startDate)}
                  <tr>
                    <td style="padding: 10px 8px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #f3f4f6; width: 45%;">Previous End Date</td>
                    <td style="padding: 10px 8px; color: #9ca3af; border-bottom: 1px solid #f3f4f6; text-align: right; text-decoration: line-through;">${data.previousEndDate}</td>
                  </tr>
                  ${detailRow('New End Date', data.newEndDate, 'color: #059669; font-weight: bold;')}
                </table>
              </div>
              <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0; color: #1e40af;">
                <p style="margin: 0; font-weight: bold;">Pricing Update</p>
                <p style="margin: 10px 0 0 0;">Additional days: ${data.additionalDays} (+$${data.additionalCost.toFixed(2)})</p>
                <p style="margin: 5px 0 0 0; font-weight: bold;">New Total: $${data.newTotalAmount.toFixed(2)}</p>
              </div>
              <p style="color: #6b7280;">If you have any questions, please don't hesitate to contact us.</p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions</strong></p>
              <p style="font-size: 12px; color: #9ca3af;">Container Rental Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })
    console.log('✅ Extension email sent to:', data.customerEmail)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending extension email:', error)
    throw error
  }
}

// Send Google review request email after payment
export async function sendReviewRequestEmail(data: {
  customerName: string
  customerEmail: string
  bookingId: string
}) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping review request email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  try {
    await sendEmail({
      to: data.customerEmail,
      subject: `How was your experience? - SD Dumping Solutions`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center;">
              <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px;">We'd Love Your Feedback!</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <p>Hi ${data.customerName},</p>
              <p>Thank you for choosing SD Dumping Solutions! We hope you had a great experience with our service.</p>
              <p>Would you mind taking a moment to leave us a review on Google? Your feedback helps us improve and helps other customers find quality service.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="https://g.page/r/sddumpingsolutions/review" style="display: inline-block; background: #059669; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Leave a Google Review</a>
              </p>
              <p style="color: #6b7280; font-size: 14px;">Thank you for your time - it means a lot to us!</p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
              <p><strong>SD Dumping Solutions</strong></p>
              <p style="font-size: 12px; color: #9ca3af;">Container Rental Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })
    console.log('✅ Review request email sent to:', data.customerEmail)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending review request email:', error)
    throw error
  }
}

// Send payment receipt email to customer
export async function sendPaymentReceiptEmail(data: {
  customerName: string
  customerEmail: string
  bookingId: string
  amount: number
  description: string
  transactionId: string
  chargedDate: string
  pricingBreakdown?: PricingBreakdown | null
}) {
  if (!isEmailConfigured) {
    console.warn('⚠️ Email not configured - skipping payment receipt email')
    return { success: true, skipped: true, reason: 'Email not configured' }
  }

  try {
    await sendEmail({
      to: data.customerEmail,
      cc: ['sandiegodumpingsolutions@gmail.com', 'diego@comcreate.org'],
      subject: `💳 Payment Receipt - $${data.amount.toFixed(2)} - Booking #${data.bookingId.slice(0, 8)}`,
      html: generatePaymentReceiptEmail(data),
    })
    console.log('✅ Payment receipt email sent to:', data.customerEmail)

    return { success: true }
  } catch (error) {
    console.error('❌ Error sending payment receipt email:', error)
    throw error
  }
}
