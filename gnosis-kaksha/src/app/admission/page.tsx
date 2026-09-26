'use client';

import { Toaster } from 'react-hot-toast';
import { AdmissionForm } from '@/components/admission/AdmissionForm';

export default function AdmissionPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 print:py-0 print:px-0">
      <div className="print:hidden">
        <Toaster position="top-right" />
      </div>
      <div className="max-w-7xl mx-auto print:max-w-none print:m-0 print:p-0">
        <div className="text-center mb-12 print:hidden">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A2B4A] mb-4">Admission Form</h1>
          <p className="text-xl text-[#4A5568]">Join Gnosis Kaksha and start your learning journey today!</p>
        </div>

        <AdmissionForm />
      </div>
    </div>
  );
}
