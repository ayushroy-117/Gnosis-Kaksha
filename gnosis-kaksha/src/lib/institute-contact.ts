/** Office contact shown to students/parents (fees help, receipts, reminders). */
export const OFFICE_PHONE_DISPLAY = process.env.NEXT_PUBLIC_OFFICE_PHONE || '+91 8474020124';

/** Digits only, with country code, for wa.me / tel: links. */
export const OFFICE_PHONE_E164 = OFFICE_PHONE_DISPLAY.replace(/\D/g, '');
