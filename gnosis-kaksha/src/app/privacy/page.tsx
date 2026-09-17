import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Gnosis Kaksha',
  description: 'Privacy Policy for Gnosis Kaksha coaching institute.',
};

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Information We Collect',
      content:
        'When you register for admission or create an account with Gnosis Kaksha, we collect personal information including your name, date of birth, contact number, email address, parent/guardian details, academic history, and address. We also collect payment-related information (transaction references) and uploaded documents such as photos and signatures.',
    },
    {
      title: '2. How We Use Your Information',
      content:
        'The information we collect is used solely for educational and administrative purposes — including processing admissions, managing fee payments, sending important notices, providing academic updates, and improving our services. We do not sell, trade, or rent your personal information to third parties.',
    },
    {
      title: '3. Data Storage & Security',
      content:
        'Your data is stored securely on Supabase-hosted servers with industry-standard encryption. We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, accidental loss, or destruction. Access to personal data is restricted to authorised Institute staff only.',
    },
    {
      title: '4. Cookies',
      content:
        'We use session cookies to manage authenticated access to student and staff portals. These cookies are necessary for the operation of our platform and do not track you across other websites. You may disable cookies in your browser, but doing so may prevent access to secure areas of the platform.',
    },
    {
      title: '5. Third-Party Services',
      content:
        'We use the following trusted third-party services: Supabase (database and authentication), Razorpay (payment processing), and Resend (transactional email). Each of these services has its own privacy policy and data handling practices. We share only the minimum data necessary for these services to function.',
    },
    {
      title: '6. Your Rights',
      content:
        'You have the right to access, correct, or request deletion of your personal data held by Gnosis Kaksha. To exercise these rights, please contact us at query@gnosiskaksha.in. We will respond to all legitimate requests within 30 days.',
    },
    {
      title: '7. Limitation of Liability',
      content:
        'Gnosis Kaksha shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services or from the disclosure of your personal data due to circumstances beyond our reasonable control, including cyberattacks or force majeure events.',
    },
    {
      title: '8. Changes to This Policy',
      content:
        'We reserve the right to update this Privacy Policy at any time. Material changes will be communicated via email or a notice on our website. Your continued use of our services after any changes constitutes acceptance of the revised policy.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-[#1A2B4A] mb-4">Privacy Policy</h1>
          <p className="text-lg text-[#4A5568]">
            Your privacy is important to us. This policy explains how we handle your data.
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-[#1295D8] to-orange-400 mx-auto mt-6" />
          <p className="text-sm text-[#718096] mt-4">Last updated: September 2026</p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition"
            >
              <h2 className="text-xl font-bold text-[#1A2B4A] mb-4">{section.title}</h2>
              <p className="text-[#4A5568] leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        {/* Contact note */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <p className="text-[#4A5568]">
            For any privacy-related concerns, contact us at{' '}
            <a
              href="mailto:query@gnosiskaksha.in"
              className="text-[#1295D8] font-semibold hover:underline"
            >
              query@gnosiskaksha.in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
