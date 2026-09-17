/**
 * lib/whatsapp.ts
 * WhatsApp integration for Gnosis Kaksha fee reminders and student alerts.
 * Supports:
 * 1. Meta WhatsApp Cloud API (Graph API)
 * 2. Twilio WhatsApp API
 * 3. Direct WhatsApp Web / Click-to-chat links (wa.me)
 */

export interface FeeReminderData {
  studentName: string;
  registrationNumber: string;
  classNumber: number | string;
  amountDue: number;
  period?: string;
  upiId?: string;
  portalUrl?: string;
  institutePhone?: string;
  parentName?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  provider: 'meta_cloud_api' | 'twilio' | 'direct_wa_link';
  messageId?: string;
  directUrl: string;
  message: string;
  recipientPhone: string;
  error?: string;
}

/**
 * Format any input phone string into clean international format (E.164 without '+').
 * Default country code is India (+91) if 10 digits provided.
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');

  // If starts with 0 and is 11 digits (e.g. 09876543210)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // If 10 digits (e.g. 9876543210), prepend 91 for India
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits;
}

/**
 * Compose a professional, well-formatted fee payment reminder message.
 */
export function generateFeeReminderMessage(data: FeeReminderData): string {
  const currentMonth =
    data.period ||
    new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const upi = data.upiId || 'gnosiskaksha@upi';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const link = data.portalUrl || `${siteUrl}/student/fees`;
  const contact = data.institutePhone || '+91 94350 12345';
  const greeting = data.parentName ? `Dear ${data.parentName},` : 'Dear Student / Parent,';

  return (
    `🔔 *FEE PAYMENT REMINDER — GNOSIS KAKSHA*\n\n` +
    `${greeting}\n\n` +
    `This is a gentle reminder regarding the pending tuition fee payment for:\n` +
    `👤 *Student:* ${data.studentName}\n` +
    `🆔 *Registration No:* ${data.registrationNumber}\n` +
    `📚 *Class:* ${data.classNumber}\n` +
    `🗓️ *Billing Cycle:* ${currentMonth}\n\n` +
    `💰 *Outstanding Amount Due: ₹${data.amountDue.toLocaleString('en-IN')}*\n\n` +
    `Please clear the pending fee at your earliest convenience using any of the following options:\n\n` +
    `1️⃣ *Pay Online via Student Portal:*\n` +
    `👉 ${link}\n\n` +
    `2️⃣ *Pay directly via UPI:*\n` +
    `📱 UPI ID: *${upi}*\n` +
    `💬 Note: Please mention *${data.registrationNumber}* in the UPI remarks.\n\n` +
    `After payment, please enter the 12-digit UTR number in your student portal or reply here with the payment receipt.\n\n` +
    `_If you have already made this payment in the last 24 hours, please disregard this message._\n\n` +
    `📞 For any billing queries, contact Accounts: ${contact}\n\n` +
    `Warm regards,\n` +
    `*Gnosis Kaksha Administration*`
  );
}

/**
 * Generate a wa.me direct click-to-chat URL.
 */
export function getWhatsAppDirectUrl(phone: string, text: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Send WhatsApp message using Meta Cloud API, Twilio, or fallback to direct link.
 */
export async function sendWhatsAppMessage({
  phone,
  message,
}: {
  phone: string;
  message: string;
}): Promise<SendWhatsAppResult> {
  const cleanPhone = formatWhatsAppPhone(phone);
  const directUrl = getWhatsAppDirectUrl(cleanPhone, message);

  // 1. Check Meta WhatsApp Cloud API
  const metaToken = process.env.WHATSAPP_API_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (metaToken && metaPhoneId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: {
              preview_url: true,
              body: message,
            },
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          provider: 'meta_cloud_api',
          messageId: data.messages[0].id,
          directUrl,
          message,
          recipientPhone: cleanPhone,
        };
      } else {
        const errMsg = data.error?.message || 'Meta Cloud API error';
        console.warn('Meta WhatsApp Cloud API failed:', errMsg);
        // Return with error and fallback URL
        return {
          success: false,
          provider: 'meta_cloud_api',
          directUrl,
          message,
          recipientPhone: cleanPhone,
          error: errMsg,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      console.warn('Meta WhatsApp Cloud API request error:', msg);
    }
  }

  // 2. Check Twilio WhatsApp API
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;

  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${twilioFrom}`);
      formData.append('To', `whatsapp:+${cleanPhone}`);
      formData.append('Body', message);

      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await res.json();
      if (res.ok && data.sid) {
        return {
          success: true,
          provider: 'twilio',
          messageId: data.sid,
          directUrl,
          message,
          recipientPhone: cleanPhone,
        };
      } else {
        const errMsg = data.message || 'Twilio WhatsApp API error';
        console.warn('Twilio WhatsApp API failed:', errMsg);
        return {
          success: false,
          provider: 'twilio',
          directUrl,
          message,
          recipientPhone: cleanPhone,
          error: errMsg,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Twilio network error';
      console.warn('Twilio WhatsApp API request error:', msg);
    }
  }

  // 3. Fallback: Direct WhatsApp URL
  // Enables immediate testing and usage without paid third-party API subscription
  return {
    success: true,
    provider: 'direct_wa_link',
    messageId: `wa-direct-${Date.now()}`,
    directUrl,
    message,
    recipientPhone: cleanPhone,
  };
}
