'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { homeFor } from '@/lib/permissions';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  // Signed-in users get a link to their own portal instead of "Login".
  const account = user ? { href: homeFor(user.role), label: 'My Dashboard' } : { href: '/auth', label: 'Login' };

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="Gnosis Kaksha Logo" 
                width={40} 
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-[#1A2B4A]">
                Gnosis Kaksha
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/" className="text-gray-700 hover:text-[#1295D8] transition">
              Home
            </Link>
            <Link href="/gallery" className="text-gray-700 hover:text-[#1295D8] transition">
              Gallery
            </Link>
            <Link href="/notices" className="text-gray-700 hover:text-[#1295D8] transition">
              Notices
            </Link>
            <Link href="/study-material" className="text-gray-700 hover:text-[#1295D8] transition">
              Study Material
            </Link>
            <Link href="/tools/bg-remover" className="text-gray-700 hover:text-[#1295D8] transition">
              Tools
            </Link>
            <Link href="/admission" className="bg-gradient-to-r from-[#1295D8] to-[#50B4F2] text-white px-6 py-2 rounded-lg hover:shadow-lg transition">
              Admission
            </Link>
            <Link href={account.href} className="text-gray-700 hover:text-[#1295D8] font-medium transition">
              {account.label}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={toggleMenu}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-[#1295D8] transition"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#1295D8] transition"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/gallery"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#1295D8] transition"
              onClick={() => setIsOpen(false)}
            >
              Gallery
            </Link>
            <Link
              href="/notices"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#1295D8] transition"
              onClick={() => setIsOpen(false)}
            >
              Notices
            </Link>
            <Link
              href="/study-material"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#1295D8] transition"
              onClick={() => setIsOpen(false)}
            >
              Study Material
            </Link>
            <Link
              href="/tools/bg-remover"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#1295D8] transition"
              onClick={() => setIsOpen(false)}
            >
              Tools
            </Link>
            <Link
              href="/admission"
              className="block px-3 py-2 rounded-md bg-gradient-to-r from-[#1295D8] to-[#50B4F2] text-white hover:shadow-lg transition"
              onClick={() => setIsOpen(false)}
            >
              Admission
            </Link>
            <Link
              href={account.href}
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#1295D8] transition font-medium"
              onClick={() => setIsOpen(false)}
            >
              {account.label}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
