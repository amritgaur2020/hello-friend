import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BillItem {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

interface TaxItem {
  name: string;
  percentage: number;
  amount: number;
}

interface EmailRequest {
  type: 'reservation_confirmation' | 'checkin_confirmation' | 'checkout_reminder' | 'invoice_email';
  to: string;
  guestName: string;
  hotelName: string;
  reservationNumber?: string;
  roomNumber?: string;
  roomType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount?: string;
  currencySymbol?: string;
  // Invoice specific fields
  invoiceNumber?: string;
  invoiceDate?: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelEmail?: string;
  nights?: number;
  items?: BillItem[];
  taxes?: TaxItem[];
  subtotal?: number;
  taxTotal?: number;
  discount?: number;
  grandTotal?: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
  paymentStatus?: string;
}

const getEmailContent = (data: EmailRequest) => {
  const { type, guestName, hotelName, reservationNumber, roomNumber, roomType, checkInDate, checkOutDate, totalAmount, currencySymbol = '₹' } = data;

  switch (type) {
    case 'reservation_confirmation':
      return {
        subject: `Reservation Confirmed - ${hotelName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; text-align: center;">${hotelName}</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Reservation Confirmed!</h2>
              <p style="color: #4b5563;">Dear ${guestName},</p>
              <p style="color: #4b5563;">Thank you for choosing ${hotelName}. Your reservation has been confirmed.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="color: #1f2937; margin-top: 0;">Reservation Details</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Confirmation #:</strong> ${reservationNumber}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Room Type:</strong> ${roomType}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Check-in:</strong> ${checkInDate}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Check-out:</strong> ${checkOutDate}</p>
                ${totalAmount ? `<p style="color: #4b5563; margin: 5px 0;"><strong>Total Amount:</strong> ${currencySymbol}${totalAmount}</p>` : ''}
              </div>
              
              <p style="color: #4b5563;">We look forward to welcoming you!</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The ${hotelName} Team</p>
            </div>
          </div>
        `,
      };

    case 'checkin_confirmation':
      return {
        subject: `Welcome to ${hotelName} - Check-in Confirmed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; text-align: center;">Welcome to ${hotelName}!</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Check-in Successful</h2>
              <p style="color: #4b5563;">Dear ${guestName},</p>
              <p style="color: #4b5563;">Welcome! Your check-in has been completed successfully.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #1f2937; margin-top: 0;">Your Stay Details</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Room Number:</strong> ${roomNumber}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Room Type:</strong> ${roomType}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Check-out Date:</strong> ${checkOutDate}</p>
              </div>
              
              <p style="color: #4b5563;">If you need any assistance, please don't hesitate to contact the front desk.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Enjoy your stay!<br>The ${hotelName} Team</p>
            </div>
          </div>
        `,
      };

    case 'checkout_reminder':
      return {
        subject: `Check-out Reminder - ${hotelName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; text-align: center;">${hotelName}</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Check-out Reminder</h2>
              <p style="color: #4b5563;">Dear ${guestName},</p>
              <p style="color: #4b5563;">This is a friendly reminder that your check-out is scheduled for today.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #1f2937; margin-top: 0;">Check-out Details</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Room Number:</strong> ${roomNumber}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Check-out Date:</strong> ${checkOutDate}</p>
              </div>
              
              <p style="color: #4b5563;">Please visit the front desk to complete the check-out process and settle any pending bills.</p>
              <p style="color: #4b5563;">Thank you for staying with us. We hope to see you again soon!</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The ${hotelName} Team</p>
            </div>
          </div>
        `,
      };

    case 'invoice_email':
      const itemsHtml = data.items?.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencySymbol}${item.rate.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencySymbol}${item.total.toLocaleString()}</td>
        </tr>
      `).join('') || '';

      const taxesHtml = data.taxes?.map(tax => `
        <tr>
          <td colspan="3" style="padding: 5px 10px; text-align: right;">${tax.name} (${tax.percentage}%):</td>
          <td style="padding: 5px 10px; text-align: right;">${currencySymbol}${tax.amount.toLocaleString()}</td>
        </tr>
      `).join('') || '';

      return {
        subject: `Invoice ${data.invoiceNumber} - ${hotelName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f9fafb;">
            <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">${hotelName}</h1>
                ${data.hotelAddress ? `<p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">${data.hotelAddress}</p>` : ''}
                ${data.hotelPhone ? `<p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">Tel: ${data.hotelPhone}</p>` : ''}
              </div>
              
              <!-- Invoice Info -->
              <div style="padding: 30px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                  <div>
                    <h2 style="color: #1f2937; margin: 0 0 10px;">INVOICE</h2>
                    <p style="color: #6b7280; margin: 5px 0;"><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                    <p style="color: #6b7280; margin: 5px 0;"><strong>Date:</strong> ${data.invoiceDate}</p>
                  </div>
                  <div style="text-align: right;">
                    <p style="color: #6b7280; margin: 5px 0;"><strong>Guest:</strong> ${guestName}</p>
                    ${roomNumber ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Room:</strong> ${roomNumber}</p>` : ''}
                    ${roomType ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Room Type:</strong> ${roomType}</p>` : ''}
                  </div>
                </div>

                <!-- Stay Details -->
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Check-in:</strong> ${checkInDate}</p>
                  <p style="margin: 5px 0; color: #4b5563;"><strong>Check-out:</strong> ${checkOutDate}</p>
                  ${data.nights ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Nights:</strong> ${data.nights}</p>` : ''}
                </div>

                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <thead>
                    <tr style="background: #1e40af; color: white;">
                      <th style="padding: 12px; text-align: left;">Description</th>
                      <th style="padding: 12px; text-align: center;">Qty</th>
                      <th style="padding: 12px; text-align: right;">Rate</th>
                      <th style="padding: 12px; text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
                      <td style="padding: 10px; text-align: right;">${currencySymbol}${(data.subtotal || 0).toLocaleString()}</td>
                    </tr>
                    ${taxesHtml}
                    ${data.discount && data.discount > 0 ? `
                      <tr>
                        <td colspan="3" style="padding: 5px 10px; text-align: right; color: #10b981;">Discount:</td>
                        <td style="padding: 5px 10px; text-align: right; color: #10b981;">-${currencySymbol}${data.discount.toLocaleString()}</td>
                      </tr>
                    ` : ''}
                    <tr style="background: #1e40af; color: white;">
                      <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Grand Total:</td>
                      <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px;">${currencySymbol}${(data.grandTotal || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colspan="3" style="padding: 10px; text-align: right;">Amount Paid:</td>
                      <td style="padding: 10px; text-align: right; color: #10b981;">${currencySymbol}${(data.amountPaid || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Balance Due:</td>
                      <td style="padding: 10px; text-align: right; font-weight: bold; color: ${(data.balanceDue || 0) > 0 ? '#ef4444' : '#10b981'};">${currencySymbol}${(data.balanceDue || 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>

                <!-- Payment Status -->
                <div style="text-align: center; padding: 15px; background: ${data.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7'}; border-radius: 8px; margin-bottom: 20px;">
                  <span style="font-weight: bold; color: ${data.paymentStatus === 'paid' ? '#166534' : '#92400e'}; text-transform: uppercase;">
                    Payment Status: ${data.paymentStatus}
                  </span>
                  ${data.paymentMethod ? `<span style="color: #6b7280;"> (${data.paymentMethod})</span>` : ''}
                </div>

                <!-- Footer -->
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; margin: 10px 0;">Thank you for staying with us!</p>
                  <p style="color: #9ca3af; font-size: 12px;">This is a computer-generated invoice.</p>
                </div>
              </div>
            </div>
          </div>
        `,
      };

    default:
      throw new Error('Invalid email type');
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const data: EmailRequest = await req.json();
    
    if (!data.to || !data.type || !data.guestName || !data.hotelName) {
      throw new Error('Missing required fields');
    }

    const emailContent = getEmailContent(data);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${data.hotelName} <onboarding@resend.dev>`,
        to: [data.to],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailResponse = await response.json();

    if (!response.ok) {
      throw new Error(emailResponse.message || 'Failed to send email');
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
