import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { sendPaymentReceiptEmail, sendReviewRequestEmail } from '@/lib/email'
import { format } from 'date-fns'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

/**
 * POST: Charge additional amount to the card used for a booking
 * This allows admins to charge extra fees, damages, etc. to the customer's saved card
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, description, isInitialCharge = false, fees = [] } = await request.json()

    // Check if TEST mode is enabled at the start
    const isTestMode = process.env.TEST === 'true'
    if (isTestMode) {
      console.log('⚠️⚠️⚠️ TEST MODE IS ON - Only $1.00 will be charged ⚠️⚠️⚠️')
    }

    console.log('🔵 [Charge Booking Card] Request:', { bookingId, amount, description, isInitialCharge, fees })
    
    // Validate inputs
    if (!bookingId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid booking ID or amount' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single()

    console.log('🔵 [Charge Booking Card] User profile:', { role: profile?.role, is_admin: profile?.is_admin })

    if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
      console.error('❌ [Charge Booking Card] User is not admin')
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    console.log('✅ [Charge Booking Card] Admin verified')

    // Get booking with payment method ID
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, payment_method_id, user_id, total_amount, status, pricing_breakdown')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('❌ [Charge Booking Card] Booking not found:', bookingError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (!booking.payment_method_id) {
      console.error('❌ [Charge Booking Card] No payment method on booking')
      return NextResponse.json(
        { error: 'No payment method saved for this booking' },
        { status: 400 }
      )
    }

    console.log('📦 [Charge Booking Card] Booking found:', {
      id: booking.id,
      paymentMethodId: booking.payment_method_id,
    })

    // Get customer ID from the payment method in Stripe
    console.log('🔵 [Charge Booking Card] Retrieving payment method from Stripe...')
    let customerId: string
    
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(booking.payment_method_id)
      
      if (!paymentMethod.customer) {
        console.error('❌ [Charge Booking Card] Payment method has no customer attached')
        return NextResponse.json(
          { error: 'Payment method is not attached to a customer' },
          { status: 400 }
        )
      }
      
      customerId = paymentMethod.customer as string
      console.log('✅ [Charge Booking Card] Customer ID from payment method:', customerId)
      
      // Update the profile with the customer ID if missing
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', booking.user_id)
        .single()
      
      if (!customerProfile?.stripe_customer_id) {
        console.log('🔵 [Charge Booking Card] Updating profile with Stripe customer ID...')
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', booking.user_id)
        console.log('✅ [Charge Booking Card] Profile updated with customer ID')
      }
    } catch (error) {
      console.error('❌ [Charge Booking Card] Failed to retrieve payment method:', error)
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    console.log('🔵 [Charge Booking Card] Creating payment intent...')

    // Use TEST mode check from top of function
    const chargeAmount = isTestMode ? 100 : Math.round(amount * 100) // $1 in test mode, full amount otherwise

    // Create a payment intent using the saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount, // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: booking.payment_method_id,
      off_session: true, // Charge without customer present
      confirm: true, // Automatically confirm the payment
      description: description || `${isInitialCharge ? 'Booking' : 'Additional'} charge for booking #${booking.id.slice(0, 8)}`,
      metadata: {
        booking_id: booking.id,
        charged_by: user.id,
        charge_type: isInitialCharge ? 'initial_booking_charge' : 'additional_fee',
      },
    })

    console.log('✅ [Charge Booking Card] Payment intent created:', paymentIntent.id)

    if (paymentIntent.status === 'succeeded') {
      // Create individual payment records for each fee
      console.log('🔵 [Charge Booking Card] Creating payment records for fees...')
      
      let paymentRecords: any[] = []
      
      if (fees && fees.length > 0) {
        // Create a single payment record with total amount, but store individual fees in notes
        console.log('🔵 [Charge Booking Card] Creating single payment with individual fees...')
        
        // Create detailed description with individual fees
        const feesDescription = fees.map((fee: any) => `${fee.description}: $${fee.amount.toFixed(2)}`).join(', ')
        const combinedNotes = `Individual fees: ${feesDescription}`
        
        const { data: newPayment, error: paymentInsertError } = await supabase
          .from('payments')
          .insert({
            booking_id: booking.id,
            amount: amount, // Total amount
            payment_method: 'stripe',
            transaction_id: paymentIntent.id,
            status: 'completed',
            notes: combinedNotes,
          })
          .select()
          .single()

        if (paymentInsertError) {
          console.error('❌ [Charge Booking Card] Failed to create payment record')
          console.error('Error:', paymentInsertError)
        } else {
          console.log('✅ [Charge Booking Card] Payment record created with individual fees')
          paymentRecords.push(newPayment)
        }
      } else {
        // Fallback: create single payment record with combined description
        console.log('🔵 [Charge Booking Card] Creating single payment record...')
        
        const { data: newPayment, error: paymentInsertError } = await supabase
          .from('payments')
          .insert({
            booking_id: booking.id,
            amount: amount,
            payment_method: 'stripe',
            transaction_id: paymentIntent.id,
            status: 'completed',
            notes: description || 'Additional charge by admin',
          })
          .select()
          .single()

        if (paymentInsertError) {
          console.error('❌ [Charge Booking Card] CRITICAL: Failed to create payment record!')
          console.error('Error:', paymentInsertError)
        } else {
          console.log('✅ [Charge Booking Card] Single payment record created')
          paymentRecords.push(newPayment)
        }
      }

      // Update booking status and amount
      if (isInitialCharge) {
        // For initial charge, update booking status to paid and confirmed
        console.log('🔵 [Charge Booking Card] Updating booking status (initial charge)...')
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id)
        console.log(`✅ [Charge Booking Card] Booking confirmed and marked as paid`)
      } else {
        // For additional charges, update total amount
        console.log('🔵 [Charge Booking Card] Updating booking total amount (additional charge)...')
        const newTotal = booking.total_amount + amount
        await supabase
          .from('bookings')
          .update({
            total_amount: newTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id)
        console.log(`✅ [Charge Booking Card] Booking total updated: $${booking.total_amount} → $${newTotal}`)
      }

      // Send payment receipt email to customer
      try {
        let customerName: string | null = null
        let customerEmail: string | null = null

        // Check if this is a phone booking (check phone_booking_guests table)
        const { data: guestInfo } = await supabase
          .from('phone_booking_guests')
          .select('customer_name, customer_email')
          .eq('booking_id', booking.id)
          .single()

        if (guestInfo) {
          // This is a phone booking - use guest info
          console.log('🔵 [Charge Booking Card] Phone booking detected - using guest info')
          customerName = guestInfo.customer_name
          customerEmail = guestInfo.customer_email
        } else {
          // Regular booking - fetch customer profile
          const { data: customerProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.user_id)
            .single()

          if (customerProfile) {
            customerName = customerProfile.full_name
            customerEmail = customerProfile.email
          }
        }

        if (customerEmail && customerName) {
          console.log('📧 [Charge Booking Card] Sending payment receipt email...')
          await sendPaymentReceiptEmail({
            customerName: customerName,
            customerEmail: customerEmail,
            bookingId: booking.id,
            amount: amount,
            description: description || `Charge for booking #${booking.id.slice(0, 8)}`,
            transactionId: paymentIntent.id,
            chargedDate: format(new Date(), "MMMM do, yyyy 'at' h:mm a"),
            pricingBreakdown: booking.pricing_breakdown || null,
          })
          console.log('✅ [Charge Booking Card] Payment receipt email sent')

          // Send Google review request email after payment is collected
          console.log('📧 [Charge Booking Card] Sending review request email...')
          await sendReviewRequestEmail({
            customerName: customerName,
            customerEmail: customerEmail,
            bookingId: booking.id,
          })
          console.log('✅ [Charge Booking Card] Review request email sent')
        } else {
          console.warn('⚠️ [Charge Booking Card] Customer email or name not found, skipping receipt email')
        }
      } catch (emailError) {
        console.error('❌ [Charge Booking Card] Error sending emails:', emailError)
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: paymentIntent.status,
        },
        message: 'Additional charge successful',
      })
    } else {
      console.error('❌ [Charge Booking Card] Payment failed:', paymentIntent.status)
      
      // Record failed payment
      await supabase.from('payments').insert({
        booking_id: booking.id,
        amount: amount,
        payment_method: 'stripe',
        transaction_id: paymentIntent.id,
        status: 'failed',
        notes: `Failed additional charge: ${paymentIntent.status}`,
      })

      return NextResponse.json(
        { error: `Payment failed: ${paymentIntent.status}` },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('❌ [Charge Booking Card] Error:', error)
    
    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message || 'Card declined' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to charge card',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

