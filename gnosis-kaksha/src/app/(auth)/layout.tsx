import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#2E5EAA] to-[#1295D8] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/logo-white.png" alt="Gnosis Kaksha logo" width={56} height={56} className="h-14 w-14 object-contain" priority />
            <span className="text-2xl font-bold text-white">Gnosis Kaksha</span>
          </div>
          <p className="text-[#CDE6F7] text-sm">Portal Access - Students, Teachers & Admin</p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-white/80">
          <p>
            For student registration, visit the{' '}
            <Link 
              href="/admission" 
              className="text-white font-semibold hover:text-[#CDE6F7] underline transition"
            >
              Admission page
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
