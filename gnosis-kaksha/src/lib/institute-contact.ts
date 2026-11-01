/** Office contact shown to students/parents (fees help, receipts, reminders). */
export const OFFICE_PHONE_DISPLAY = process.env.NEXT_PUBLIC_OFFICE_PHONE || '+91 9954586520';

/** Digits only, with country code, for wa.me / tel: links. */
export const OFFICE_PHONE_E164 = OFFICE_PHONE_DISPLAY.replace(/\D/g, '');

/** Official postal address and helpline printed on receipts and ID cards. */
export const INSTITUTE_NAME = 'GNOSIS KAKSHA';
export const INSTITUTE_TAGLINE = 'A Place For Excellence';
export const INSTITUTE_ADDRESS_SHORT = 'Ramkrishna Nagar, Sribhumi, Assam - 788166';
export const INSTITUTE_ADDRESS_FULL = 'Block Road, Ramkrishna Nagar, Sribhumi, Assam - 788166';
export const HELPLINE_DISPLAY = '8474020124';
/** Approver on salary receipts (from the institute's sample receipt). */
export const DIRECTOR_NAME = 'Ankur Kumar Nath';
export const DIRECTOR_TITLE = 'Founder & CEO';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gnosiskaksha.in').replace(/\/$/, '');
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
