'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Heart, Send, Clock } from 'lucide-react';

// Proper SVG icons for each social platform
const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TelegramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.7 8.02c-.12.56-.46.7-.93.43l-2.57-1.9-1.24 1.19c-.14.14-.26.26-.52.26l.18-2.62 4.73-4.27c.21-.18-.04-.28-.32-.1L7.46 15.4l-2.52-.79c-.55-.17-.56-.55.11-.81l9.86-3.8c.46-.17.86.11.73.8z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
  </svg>
);

const socialLinks = [
  { href: 'https://www.facebook.com/gnosiskaksha.in', label: 'Facebook', Icon: FacebookIcon },
  { href: 'https://x.com/gnosiskaksha', label: 'X (Twitter)', Icon: XIcon },
  { href: 'https://www.instagram.com/gnosiskaksha/', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://www.linkedin.com/in/ankurknath/', label: 'LinkedIn', Icon: LinkedInIcon },
  { href: 'https://t.me/gnosiskaksha', label: 'Telegram', Icon: TelegramIcon },
  { href: 'https://www.youtube.com/@gnosiskaksha', label: 'YouTube', Icon: YouTubeIcon },
];

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white mt-20 print:hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* About Us */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-wide">
              About Us
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              We understand that every student has different needs and capabilities, which is why we create a wonderful platform that is the best fit for every student.
            </p>
            {/* Social Icons */}
            <div className="flex flex-wrap gap-3 pt-1">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#1295D8] flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-wide">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', href: '/' },
                { label: 'Admissions', href: '/admission' },
                { label: 'Notices', href: '/notices' },
                { label: 'Student Portal', href: '/student/dashboard' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-gray-400 hover:text-[#50B4F2] text-sm transition-colors duration-150 flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#1295D8] opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Our Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-wide">Our Services</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Terms & Conditions', href: '#' },
                { label: 'Privacy Policy', href: '#' },
                { label: 'Refund Policy', href: '#' },
                { label: 'Contact', href: '#' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-gray-400 hover:text-[#50B4F2] text-sm transition-colors duration-150 flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#1295D8] opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-wide">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="h-4 w-4 text-[#50B4F2] flex-shrink-0 mt-0.5" />
                <span>Block Road, Ramkrishna Nagar, Sribhumi</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone className="h-4 w-4 text-[#50B4F2] flex-shrink-0" />
                <span>+91 8474020124, +91 6900184347</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="h-4 w-4 text-[#50B4F2] flex-shrink-0" />
                <span>query.gnosiskaksha.in</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Clock className="h-4 w-4 text-[#50B4F2] flex-shrink-0" />
                <span>Mon – Sun: 06:00 AM to 07:00 PM</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider + Bottom bar */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-center text-gray-500 text-sm">
            © 2025 GNOSIS KAKSHA. All rights reserved &nbsp;|&nbsp; Designed with{' '}
            <Heart className="h-3.5 w-3.5 inline text-red-500 mx-0.5" />
            {' '}for education
          </p>
        </div>
      </div>
    </footer>
  );
}