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

// Helper function to generate pricing breakdown HTML
function generatePricingBreakdownHtml(breakdown: PricingBreakdown | null | undefined): string {
  if (!breakdown) return ''

  const lines: string[] = []

  // Base price (includes days)
  lines.push(`<div class="detail-row"><span class="label">Base Price (${breakdown.includedDays} days included):</span><span class="value">$${breakdown.basePrice.toFixed(2)}</span></div>`)

  // Extra days
  if (breakdown.extraDays > 0) {
    lines.push(`<div class="detail-row"><span class="label">Extra Days (${breakdown.extraDays} x $25):</span><span class="value">$${breakdown.extraDaysAmount.toFixed(2)}</span></div>`)
  }

  // Extra tonnage
  if (breakdown.extraTonnage > 0) {
    lines.push(`<div class="detail-row"><span class="label">Extra Tonnage (${breakdown.extraTonnage} x $125):</span><span class="value">$${breakdown.extraTonnageAmount.toFixed(2)}</span></div>`)
  }

  // Appliances
  if (breakdown.applianceCount > 0) {
    lines.push(`<div class="detail-row"><span class="label">Appliances (${breakdown.applianceCount} x $25):</span><span class="value">$${breakdown.applianceAmount.toFixed(2)}</span></div>`)
  }

  // Distance fee
  if (breakdown.distanceFee > 0) {
    const milesText = breakdown.distanceMiles ? ` (${breakdown.distanceMiles.toFixed(1)} mi)` : ''
    lines.push(`<div class="detail-row"><span class="label">Distance Fee${milesText}:</span><span class="value">$${breakdown.distanceFee.toFixed(2)}</span></div>`)
  }

  // Travel fee
  if (breakdown.travelFee > 0) {
    lines.push(`<div class="detail-row"><span class="label">Travel Fee:</span><span class="value">$${breakdown.travelFee.toFixed(2)}</span></div>`)
  }

  // Price adjustment
  if (breakdown.priceAdjustment !== 0) {
    const adjustLabel = breakdown.priceAdjustment < 0 ? 'Discount' : 'Additional Charge'
    const reasonText = breakdown.adjustmentReason ? ` (${breakdown.adjustmentReason})` : ''
    lines.push(`<div class="detail-row"><span class="label">${adjustLabel}${reasonText}:</span><span class="value" style="color: ${breakdown.priceAdjustment < 0 ? '#059669' : '#dc2626'};">${breakdown.priceAdjustment < 0 ? '-' : '+'}$${Math.abs(breakdown.priceAdjustment).toFixed(2)}</span></div>`)
  }

  if (lines.length === 0) return ''

  return `
    <div class="card">
      <h2 style="color: #2563eb; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">💰 Pricing Breakdown</h2>
      ${lines.join('\n')}
      <div class="detail-row" style="border-top: 2px solid #e5e7eb; margin-top: 10px; padding-top: 10px; font-weight: bold;">
        <span class="label" style="font-size: 16px;">Total:</span>
        <span class="value" style="font-size: 16px; color: #059669;">$${breakdown.total.toFixed(2)}</span>
      </div>
    </div>
  `
}

function generateGuestInquiryEmail(data: GuestInquiryEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
  </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://res.cloudinary.com/dku1gnuat/image/upload/f_auto,q_auto/sddumps/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
        <h2>New Guest Booking Request</h2>
        <p style="margin: 6px 0 0 0">No account – follow-up required</p>
      </div>
      <div class="card">
        <div class="row"><span class="label">Name</span><span class="value">${data.customerName}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${data.customerEmail}</span></div>
        ${data.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${data.phone}</span></div>` : ''}
      </div>
      <div class="card">
        <div class="row"><span class="label">Container</span><span class="value">${data.containerType}</span></div>
        <div class="row"><span class="label">Service</span><span class="value" style="text-transform: capitalize">${data.serviceType}</span></div>
        <div class="row"><span class="label">Start</span><span class="value">${data.startDate}</span></div>
        <div class="row"><span class="label">End</span><span class="value">${data.endDate}</span></div>
        ${data.deliveryAddress ? `<div class="row"><span class="label">Delivery Address</span><span class="value">${data.deliveryAddress}</span></div>` : ''}
      </div>
      ${data.notes ? `<div class="card"><div class="label" style="margin-bottom: 8px">Notes</div><div class="value">${data.notes}</div></div>` : ''}
    </div>
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .message-box { background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 16px; border-left: 4px solid #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h2>New Contact Form Submission</h2>
      <p style="margin: 6px 0 0 0">From your website contact page</p>
    </div>
    <div class="card">
      <div class="row"><span class="label">Name</span><span class="value">${data.firstName} ${data.lastName}</span></div>
      <div class="row"><span class="label">Email</span><span class="value">${data.email}</span></div>
      ${data.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${data.phone}</span></div>` : ''}
      ${data.service ? `<div class="row"><span class="label">Service Type</span><span class="value">${data.service}</span></div>` : ''}
    </div>
    <div class="card">
      <div class="label" style="margin-bottom: 8px">Message</div>
      <div class="message-box">${data.message}</div>
    </div>
  </div>
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .total { background: #eff6ff; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; color: #2563eb; text-align: center; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>🎉 Booking Confirmed!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your order</p>
    </div>

    <div class="content">
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${data.customerName}</strong>,</p>
      <p>Your container rental has been successfully booked! Here are your booking details:</p>

      <div class="card">
        <h2>📦 Booking Information</h2>
        <div class="detail-row">
          <span class="label">Booking ID:</span>
          <span class="value">#${data.bookingId.slice(0, 8)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Container Type:</span>
          <span class="value">${data.containerType}</span>
        </div>
        <div class="detail-row">
          <span class="label">Service Type:</span>
          <span class="value" style="text-transform: capitalize;">${data.serviceType}</span>
        </div>
        ${data.pickupTime ? `
        <div class="detail-row">
          <span class="label">Preferred Time:</span>
          <span class="value">${data.pickupTime}</span>
        </div>
        ` : ''}
      </div>

      <div class="card">
        <h2>📅 Rental Period</h2>
        <div class="detail-row">
          <span class="label">Start Date:</span>
          <span class="value">${data.startDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">End Date:</span>
          <span class="value">${data.endDate}</span>
        </div>
        ${data.deliveryAddress ? `
        <div class="detail-row">
          <span class="label">Delivery Address:</span>
          <span class="value">${data.deliveryAddress}</span>
        </div>
        ` : ''}
      </div>

      ${data.notes ? `
      <div class="card">
        <h2>📝 Additional Notes</h2>
        <p style="margin: 0; color: #4b5563;">${data.notes}</p>
      </div>
      ` : ''}

      ${generatePricingBreakdownHtml(data.pricingBreakdown)}

      <div class="total">
        Total Amount: $${data.totalAmount.toFixed(2)}
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;"><strong>⏰ What's Next?</strong></p>
        <p style="margin: 10px 0 0 0; color: #92400e;">
          Our team will contact you 24 hours before your scheduled ${data.serviceType === 'delivery' ? 'delivery' : 'pickup'} date to confirm the details.
        </p>
      </div>

      <p style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.sddumpingsolutions.com'}/bookings" class="button">View My Bookings</a>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions or need to make changes to your booking, please don't hesitate to contact us.
      </p>
    </div>

    <div class="footer">
      <p><strong>SD Dumping Solutions</strong></p>
      <p>Professional Waste Management Services</p>
      <p style="margin: 10px 0;">
        📧 ${process.env.EMAIL_FROM} | 📞 Contact Us
      </p>
      <p style="font-size: 12px; color: #9ca3af;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #dc2626; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .alert { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 20px 0; color: #991b1b; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>🔔 New Booking Alert</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Action Required</p>
    </div>

    <div class="content">
      <div class="alert">
        <p style="margin: 0; font-weight: bold;">⚠️ A new booking has been created and requires your attention.</p>
      </div>

      <div class="card">
        <h2>📦 Booking Details</h2>
        <div class="detail-row">
          <span class="label">Booking ID:</span>
          <span class="value">#${data.bookingId.slice(0, 8)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Status:</span>
          <span class="value" style="color: #059669; font-weight: bold;">CONFIRMED</span>
        </div>
        <div class="detail-row">
          <span class="label">Container Type:</span>
          <span class="value">${data.containerType}</span>
        </div>
        <div class="detail-row">
          <span class="label">Service Type:</span>
          <span class="value" style="text-transform: capitalize;">${data.serviceType}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total Amount:</span>
          <span class="value" style="color: #059669; font-weight: bold;">$${data.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div class="card">
        <h2>👤 Customer Information</h2>
        <div class="detail-row">
          <span class="label">Name:</span>
          <span class="value">${data.customerName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Email:</span>
          <span class="value">${data.customerEmail}</span>
        </div>
      </div>

      <div class="card">
        <h2>📅 Schedule</h2>
        <div class="detail-row">
          <span class="label">Start Date:</span>
          <span class="value">${data.startDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">End Date:</span>
          <span class="value">${data.endDate}</span>
        </div>
        ${data.pickupTime ? `
        <div class="detail-row">
          <span class="label">Preferred Time:</span>
          <span class="value">${data.pickupTime}</span>
        </div>
        ` : ''}
        ${data.deliveryAddress ? `
        <div class="detail-row">
          <span class="label">Delivery Address:</span>
          <span class="value">${data.deliveryAddress}</span>
        </div>
        ` : ''}
      </div>

      ${data.notes ? `
      <div class="card">
        <h2>📝 Customer Notes</h2>
        <p style="margin: 0; color: #4b5563; background: #f3f4f6; padding: 15px; border-radius: 6px;">${data.notes}</p>
      </div>
      ` : ''}

      ${generatePricingBreakdownHtml(data.pricingBreakdown)}

      <p style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.sddumpingsolutions.com'}/admin/bookings" class="button">Manage Booking</a>
      </p>

      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af;"><strong>📋 Action Items:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1e40af;">
          <li>Review booking details in the admin panel</li>
          <li>Confirm container availability</li>
          <li>Contact customer 24 hours before scheduled date</li>
          <li>Prepare ${data.serviceType === 'delivery' ? 'delivery logistics' : 'pickup instructions'}</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p><strong>SD Dumping Solutions Admin Panel</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">
        This is an automated notification from your booking system.
      </p>
    </div>
  </div>
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .button { display: inline-block; background: white; color: #2563eb; padding: 15px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 16px; font-weight: bold; border: 2px solid #2563eb; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; color: #92400e; }
    .warning { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 20px 0; color: #991b1b; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>📋 Complete Your Booking</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">One More Step Required</p>
    </div>

    <div class="content">
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${data.customerName}</strong>,</p>
      <p>Thank you for booking with SD Dumping Solutions! We've reserved a container for you. To complete your booking, please click the button below to review your booking details, sign the rental agreement, and securely save your payment information.</p>

      <div class="card">
        <h2>📦 Your Booking Details</h2>
        <div class="detail-row">
          <span class="label">Container Type:</span>
          <span class="value">${data.containerType}</span>
        </div>
        <div class="detail-row">
          <span class="label">Start Date:</span>
          <span class="value">${data.startDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">End Date:</span>
          <span class="value">${data.endDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total Amount:</span>
          <span class="value" style="color: #059669; font-weight: bold;">$${data.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      ${generatePricingBreakdownHtml(data.pricingBreakdown)}

      <div class="alert">
        <p style="margin: 0; font-weight: bold;">💳 Important: Your card will NOT be charged yet!</p>
        <p style="margin: 10px 0 0 0;">
          We only need to securely save your payment method. You'll be charged when your rental begins.
        </p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.paymentLink}" class="button">Review & Sign Contract</a>
      </p>

      <div class="warning">
        <p style="margin: 0; font-weight: bold;">⏰ This link expires on ${data.expiresAt}</p>
        <p style="margin: 10px 0 0 0;">
          Please complete your booking within 7 days. After that, this link will expire and your reservation will be cancelled.
        </p>
      </div>

      <div class="card">
        <h2>🔒 What You'll Need To Complete</h2>
        <ul style="margin: 10px 0; padding-left: 20px; color: #4b5563;">
          <li>Review your booking details</li>
          <li>Save a valid credit or debit card</li>
          <li>Read and sign the rental agreement</li>
        </ul>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions or didn't request this booking, please contact us immediately.
      </p>
    </div>

    <div class="footer">
      <p><strong>SD Dumping Solutions</strong></p>
      <p>Professional Waste Management Services</p>
      <p style="margin: 10px 0;">
        📧 ${process.env.EMAIL_FROM} | 📞 Contact Us
      </p>
      <p style="font-size: 12px; color: #9ca3af;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
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
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #059669; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .success { background: #d1fae5; border-left: 4px solid #059669; padding: 15px; border-radius: 4px; margin: 20px 0; color: #065f46; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>✅ Phone Booking Completed!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Customer has saved their card</p>
    </div>

    <div class="content">
      <div class="success">
        <p style="margin: 0; font-weight: bold;">🎉 Great news! The customer has completed their phone booking.</p>
        <p style="margin: 10px 0 0 0;">
          Their payment method has been securely saved and the booking is ready to be charged.
        </p>
      </div>

      <div class="card">
        <h2>📦 Booking Information</h2>
        <div class="detail-row">
          <span class="label">Booking ID:</span>
          <span class="value">#${data.bookingId.slice(0, 8)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Status:</span>
          <span class="value" style="color: #059669; font-weight: bold;">READY TO CHARGE</span>
        </div>
        <div class="detail-row">
          <span class="label">Container Type:</span>
          <span class="value">${data.containerType}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total Amount:</span>
          <span class="value" style="color: #059669; font-weight: bold;">$${data.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div class="card">
        <h2>👤 Customer Information</h2>
        <div class="detail-row">
          <span class="label">Name:</span>
          <span class="value">${data.customerName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Email:</span>
          <span class="value">${data.customerEmail}</span>
        </div>
      </div>

      <p style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.sddumpingsolutions.com'}/admin/payments" class="button">Charge Customer Now</a>
      </p>

      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af;"><strong>📋 Next Steps:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #1e40af;">
          <li>Go to the Payment Tracker in your admin dashboard</li>
          <li>Find this booking in the "Pending" section</li>
          <li>Click "Charge Customer" when ready</li>
          <li>The saved card will be charged automatically</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p><strong>SD Dumping Solutions Admin Panel</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">
        This is an automated notification from your booking system.
      </p>
    </div>
  </div>
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
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #059669; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .success { background: #d1fae5; border-left: 4px solid #059669; padding: 15px; border-radius: 4px; margin: 20px 0; color: #065f46; }
    .info { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0; color: #1e40af; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>✅ Booking Confirmed!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Your payment information has been saved successfully</p>
    </div>

    <div class="content">
      <p>Hi ${data.customerName},</p>

      <div class="success">
        <p style="margin: 0; font-weight: bold;">🎉 Your booking is confirmed!</p>
        <p style="margin: 10px 0 0 0;">
          We've securely saved your payment information and your booking is all set.
        </p>
      </div>

      <div class="info">
        <p style="margin: 0; font-weight: bold;">💳 Important Notice</p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li><strong>Your card has been saved but NOT charged yet</strong></li>
          <li>You'll be charged when your rental period begins</li>
          <li>You'll receive a receipt via email when charged</li>
          <li>Our team will contact you 24 hours before your scheduled date</li>
        </ul>
      </div>

      <div class="card">
        <h2>📦 Booking Summary</h2>
        <div class="detail-row">
          <span class="label">Booking ID:</span>
          <span class="value">#${data.bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div class="detail-row">
          <span class="label">Container:</span>
          <span class="value">${data.containerType}</span>
        </div>
        <div class="detail-row">
          <span class="label">Start Date:</span>
          <span class="value">${data.startDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">End Date:</span>
          <span class="value">${data.endDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total Amount:</span>
          <span class="value" style="color: #059669; font-weight: bold;">$${data.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <p style="text-align: center; margin: 30px 0 10px 0; color: #6b7280;">
        Questions? Contact us anytime - we're here to help!
      </p>
    </div>

    <div class="footer">
      <p><strong>SD Dumping Solutions</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">
        Thank you for choosing SD Dumping Solutions for your container rental needs!
      </p>
    </div>
  </div>
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
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .amount-box { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .amount-box .label { color: rgba(255, 255, 255, 0.9); font-size: 14px; }
    .amount-box .amount { font-size: 36px; font-weight: bold; margin: 10px 0; }
    .info { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0; color: #1e40af; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>💳 Payment Receipt</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Your payment has been processed</p>
    </div>

    <div class="content">
      <p>Hi ${data.customerName},</p>

      <div class="amount-box">
        <p class="label">Amount Charged</p>
        <p class="amount">$${data.amount.toFixed(2)}</p>
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">Payment Successful</p>
      </div>

      <div class="card">
        <h2>📋 Payment Details</h2>
        <div class="detail-row">
          <span class="label">Booking ID:</span>
          <span class="value">#${data.bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div class="detail-row">
          <span class="label">Description:</span>
          <span class="value">${data.description}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date:</span>
          <span class="value">${data.chargedDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Transaction ID:</span>
          <span class="value" style="font-size: 11px; font-family: monospace;">${data.transactionId}</span>
        </div>
      </div>

      <div class="info">
        <p style="margin: 0; font-weight: bold;">📧 Receipt Confirmation</p>
        <p style="margin: 10px 0 0 0;">
          This email serves as your receipt. Please save it for your records. If you have any questions about this charge, please contact us.
        </p>
      </div>

      <p style="text-align: center; margin: 30px 0 10px 0; color: #6b7280;">
        Thank you for your business!
      </p>
    </div>

    <div class="footer">
      <p><strong>SD Dumping Solutions</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">
        Container Rental Services
      </p>
    </div>
  </div>
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #dc2626; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>Booking Cancelled</h1>
    </div>
    <div class="content">
      <p>Hi ${data.customerName},</p>
      <p>Your booking has been cancelled. Here are the details:</p>
      <div class="card">
        <h2>📦 Booking Details</h2>
        <div class="detail-row"><span class="label">Booking ID:</span><span class="value">#${data.bookingId.slice(0, 8)}</span></div>
        <div class="detail-row"><span class="label">Container:</span><span class="value">${data.containerType}</span></div>
        <div class="detail-row"><span class="label">Start Date:</span><span class="value">${data.startDate}</span></div>
        <div class="detail-row"><span class="label">End Date:</span><span class="value">${data.endDate}</span></div>
        ${data.reason ? `<div class="detail-row"><span class="label">Reason:</span><span class="value">${data.reason}</span></div>` : ''}
      </div>
      <p style="color: #6b7280;">If you have any questions about this cancellation, please don't hesitate to contact us.</p>
    </div>
    <div class="footer">
      <p><strong>SD Dumping Solutions</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">Container Rental Services</p>
    </div>
  </div>
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #2563eb; margin-top: 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; }
    .value { color: #111827; }
    .info { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0; color: #1e40af; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>📅 Booking Extended</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Your rental period has been updated</p>
    </div>
    <div class="content">
      <p>Hi ${data.customerName},</p>
      <p>Your booking has been extended. Here are the updated details:</p>
      <div class="card">
        <h2>📦 Booking Details</h2>
        <div class="detail-row"><span class="label">Booking ID:</span><span class="value">#${data.bookingId.slice(0, 8)}</span></div>
        <div class="detail-row"><span class="label">Container:</span><span class="value">${data.containerType}</span></div>
        <div class="detail-row"><span class="label">Start Date:</span><span class="value">${data.startDate}</span></div>
        <div class="detail-row"><span class="label">Previous End Date:</span><span class="value" style="text-decoration: line-through; color: #9ca3af;">${data.previousEndDate}</span></div>
        <div class="detail-row"><span class="label">New End Date:</span><span class="value" style="color: #059669; font-weight: bold;">${data.newEndDate}</span></div>
      </div>
      <div class="info">
        <p style="margin: 0; font-weight: bold;">💰 Pricing Update</p>
        <p style="margin: 10px 0 0 0;">Additional days: ${data.additionalDays} (+$${data.additionalCost.toFixed(2)})</p>
        <p style="margin: 5px 0 0 0; font-weight: bold;">New Total: $${data.newTotalAmount.toFixed(2)}</p>
      </div>
      <p style="color: #6b7280;">If you have any questions, please don't hesitate to contact us.</p>
    </div>
    <div class="footer">
      <p><strong>SD Dumping Solutions</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">Container Rental Services</p>
    </div>
  </div>
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
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 16px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.sddumpingsolutions.com/logo.png" alt="SD Dumping Solutions" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>⭐ We'd Love Your Feedback!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.customerName},</p>
      <p>Thank you for choosing SD Dumping Solutions! We hope you had a great experience with our service.</p>
      <p>Would you mind taking a moment to leave us a review on Google? Your feedback helps us improve and helps other customers find quality service.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://g.page/r/sddumpingsolutions/review" class="button">Leave a Google Review</a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">Thank you for your time - it means a lot to us!</p>
    </div>
    <div class="footer">
      <p><strong>SD Dumping Solutions</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">Container Rental Services</p>
    </div>
  </div>
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
