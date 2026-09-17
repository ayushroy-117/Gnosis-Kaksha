import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy | Gnosis Kaksha',
  description: 'Refund and cancellation policy for Gnosis Kaksha coaching institute.',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-[#1A2B4A] mb-4">Refund Policy</h1>
          <p className="text-lg text-[#4A5568]">
            Please read our refund and cancellation policy carefully before making a payment.
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-[#1295D8] to-orange-400 mx-auto mt-6" />
          <p className="text-sm text-[#718096] mt-4">Last updated: September 2026</p>
        </div>

        {/* Summary Banner */}
        <div className="bg-orange-50 border-l-4 border-orange-400 rounded-xl p-6 mb-10">
          <p className="text-orange-800 font-semibold text-lg">
            ⚠️ Fees paid to Gnosis Kaksha are generally non-refundable. Please review the exceptions below.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-[#1A2B4A] mb-4">1. General Policy</h2>
            <p className="text-[#4A5568] leading-relaxed">
              All fees paid to Gnosis Kaksha — including admission fees, monthly tuition fees,
              examination fees, and T-shirt fees — are non-refundable under normal circumstances.
              Once a payment is made and the admission is confirmed, the seat is reserved for the
              student for the enrolled academic period.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-[#1A2B4A] mb-4">2. Exceptions</h2>
            <p className="text-[#4A5568] leading-relaxed mb-4">
              Refunds may be considered only in the following exceptional circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#4A5568]">
              <li>The Institute cancels a batch or course before it commences.</li>
              <li>A student is denied admission after payment due to an error on the Institute&apos;s part.</li>
              <li>
                A duplicate payment is made (the duplicate amount will be refunded within 7–10
                business days).
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-[#1A2B4A] mb-4">3. Cancellation Policy</h2>
            <p className="text-[#4A5568] leading-relaxed">
              If a student wishes to withdraw from the Institute, they must inform the administration
              in writing. The cancellation takes effect at the end of the current billing month.
              No mid-month or partial-month refunds will be issued. Students who withdraw will not
              be eligible for a refund of any fees already paid for the current month.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-[#1A2B4A] mb-4">4. Scholarship Fees</h2>
            <p className="text-[#4A5568] leading-relaxed">
              Scholarship discounts are applied at the time of admission based on the previous
              academic percentage submitted. If the submitted percentage is found to be incorrect or
              fraudulent, the full fee (without discount) will be charged, and any outstanding
              balance must be paid immediately.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-[#1A2B4A] mb-4">5. Refund Process</h2>
            <p className="text-[#4A5568] leading-relaxed">
              In cases where a refund is approved, the amount will be processed back to the original
              payment method within 7–14 business days. Refund requests must be submitted in writing
              to{' '}
              <a href="mailto:query@gnosiskaksha.in" className="text-[#1295D8] hover:underline">
                query@gnosiskaksha.in
              </a>{' '}
              along with proof of payment (receipt or transaction ID).
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-[#1A2B4A] mb-4">6. Contact for Disputes</h2>
            <p className="text-[#4A5568] leading-relaxed">
              For any payment-related queries or disputes, please contact the Institute at{' '}
              <a href="mailto:query@gnosiskaksha.in" className="text-[#1295D8] hover:underline">
                query@gnosiskaksha.in
              </a>{' '}
              or call{' '}
              <a href="tel:+918474020124" className="text-[#1295D8] hover:underline">
                +91 8474020124
              </a>
              . All disputes are subject to the jurisdiction of the Karimganj Court, Assam, India.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
