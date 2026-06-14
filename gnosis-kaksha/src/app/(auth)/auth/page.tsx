import { AuthTabs } from '@/components/auth/AuthTabs';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Login - Gnosis Kaksha',
};

export default function AuthPage() {
  return (
    <div className="space-y-8">
      <AuthTabs />
      
      {/* Student Registration CTA */}
      <div className="bg-[#CDE6F7] rounded-lg p-6 border-l-4 border-[#1295D8]">
        <h3 className="font-semibold text-[#1A2B4A] mb-2">Are you a student?</h3>
        <p className="text-sm text-gray-700 mb-4">
          Complete your registration through our admission form to get started.
        </p>
        <Link
          href="/admission"
          className="inline-flex items-center gap-2 bg-[#1295D8] text-white px-4 py-2 rounded-lg hover:bg-[#2E5EAA] transition font-medium text-sm"
        >
          Go to Student Registration
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
