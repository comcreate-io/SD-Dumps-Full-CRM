import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { sendPhoneBookingCompletedEmail, sendCustomerConfirmationEmail } from "@/lib/email"
import Stripe from "stripe"
import { format } from "date-fns"

// Parse date string (YYYY-MM-DD) to local date to avoid timezone issues
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
})

export async function POST(request: Request) {
  try {
    const { token, paymentMethodId, signatureUrl } = await request.json()

    if (!token || !paymentMethodId || !signatureUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch payment link with booking details
    const { data: paymentLink, error: linkError } = await supabase
      .from("payment_links")
      .select(`
        *,
        bookings (
          id,
          container_type_id,
          start_date,
          end_date,
          total_amount,
          pricing_breakdown,
          status,
          container_types (
            name
          )
        )
      `)
      .eq("token", token)
      .single()

    if (linkError || !paymentLink) {
      return NextResponse.json({ error: "Invalid payment link" }, { status: 404 })
    }

    // Check if already completed
    if (paymentLink.status === "completed") {
      return NextResponse.json({ error: "Payment link already completed" }, { status: 400 })
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(paymentLink.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({ error: "Payment link expired" }, { status: 400 })
    }

    const booking = paymentLink.bookings as any

    // Check if booking is cancelled
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Booking is cancelled" }, { status: 400 })
    }

    // Attach payment method to customer (create customer if needed)
    let customerId: string
    try {
      // Check if customer exists with this email
      const customers = await stripe.customers.list({
        email: paymentLink.customer_email,
        limit: 1,
      })

      if (customers.data.length > 0) {
        customerId = customers.data[0].id
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: paymentLink.customer_email,
          name: paymentLink.customer_name,
          phone: paymentLink.customer_phone || undefined,
          metadata: {
            booking_id: booking.id,
          },
        })
        customerId = customer.id
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      })

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })

      console.log("✅ Payment method attached to customer:", customerId)
    } catch (stripeError) {
      console.error("❌ Stripe error:", stripeError)
      return NextResponse.json(
        { error: "Failed to save payment method" },
        { status: 500 }
      )
    }

    // Update booking with payment method and signature
    // Status stays "pending" for admin to manually charge from Payment Tracker
    console.log("🔵 [Payment Link Complete] Updating booking:", {
      booking_id: booking.id,
      payment_method_id: paymentMethodId,
      signature_img_url: signatureUrl,
    })

    const { data: updatedBooking, error: bookingError } = await supabase
      .from("bookings")
      .update({
        payment_method_id: paymentMethodId,
        signature_img_url: signatureUrl,
        status: "pending",
        payment_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .select()

    if (bookingError) {
      console.error("❌ [Payment Link Complete] Error updating booking:", bookingError)
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
    }

    console.log("✅ [Payment Link Complete] Booking updated successfully:", {
      booking_id: booking.id,
      has_payment_method_id: !!updatedBooking?.[0]?.payment_method_id,
      payment_method_id: updatedBooking?.[0]?.payment_method_id,
    })

    // Update payment link status
    const { error: linkUpdateError } = await supabase
      .from("payment_links")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("token", token)

    if (linkUpdateError) {
      console.error("Error updating payment link:", linkUpdateError)
    }

    // Send confirmation email to customer
    try {
      await sendCustomerConfirmationEmail({
        customerName: paymentLink.customer_name,
        customerEmail: paymentLink.customer_email,
        bookingId: booking.id,
        containerType: booking.container_types.name,
        startDate: format(parseLocalDate(booking.start_date), "MMMM do, yyyy"),
        endDate: format(parseLocalDate(booking.end_date), "MMMM do, yyyy"),
        totalAmount: booking.total_amount,
        pricingBreakdown: booking.pricing_breakdown || null,
      })
    } catch (emailError) {
      console.error("Error sending customer confirmation email:", emailError)
      // Don't fail the request if email fails
    }

    // Send notification to admin
    try {
      await sendPhoneBookingCompletedEmail({
        customerName: paymentLink.customer_name,
        customerEmail: paymentLink.customer_email,
        bookingId: booking.id,
        containerType: booking.container_types.name,
        totalAmount: booking.total_amount,
        pricingBreakdown: booking.pricing_breakdown || null,
      })
    } catch (emailError) {
      console.error("Error sending admin notification email:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
    })
  } catch (error) {
    console.error("Error completing payment link:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
