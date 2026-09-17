import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Gnosis Kaksha',
  description: 'Terms and Conditions for Gnosis Kaksha coaching institute.',
};

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content:
        'By accessing or using the services provided by Gnosis Kaksha ("the Institute"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services. These terms apply to all students, parents/guardians, and visitors of the Institute.',
    },
    {
      title: '2. User Registration',
      content:
        'You must provide accurate, current, and complete information during the registration process. You are responsible for safeguarding your account credentials and for any activities that occur under your account. Gnosis Kaksha reserves the right to suspend or terminate accounts where information provided is found to be inaccurate or incomplete.',
    },
    {
      title: '3. Course Enrollment',
      content:
        'Enrollment in courses is subject to seat availability and is confirmed only after payment of the applicable fees. The Institute reserves the right to modify, suspend, or discontinue any course or batch at any time, with reasonable prior notice to enrolled students. In such cases, alternative arrangements or refunds will be offered at the Institute\'s discretion.',
    },
    {
      title: '4. Intellectual Property',
      content:
        'All study materials, notes, question papers, videos, and other educational content provided by Gnosis Kaksha are the intellectual property of the Institute. Students are not permitted to reproduce, distribute, share, upload, or sell any of these materials without prior written consent from the Institute.',
    },
    {
      title: '5. Code of Conduct',
      content:
        'Students are expected to behave respectfully toward faculty, staff, and fellow students both on-premises and online. Gnosis Kaksha reserves the right to terminate the enrollment of any student who engages in misconduct, harassment, cheating, or any behaviour deemed harmful to the Institute community.',
    },
    {
      title: '6. Disclaimer of Warranties',
      content:
        'Gnosis Kaksha provides its services on an "as is" and "as available" basis. While we strive for excellence, the Institute does not guarantee specific academic outcomes, marks, or results. We make no warranties, express or implied, regarding the accuracy, completeness, or fitness for a particular purpose of any educational material.',
    },
    {
      title: '7. Termination of Services',
      content:
        'The Institute may terminate or restrict your access to its services at any time, without notice, for conduct that it believes violates these Terms and Conditions or is harmful to other students, staff, or the Institute\'s reputation.',
    },
    {
      title: '8. Modification of Terms',
      content:
        'Gnosis Kaksha reserves the right to update or modify these Terms and Conditions at any time. Changes will be effective immediately upon posting to the website. Continued use of our services after any modifications constitutes your acceptance of the revised terms.',
    },
    {
      title: '9. Governing Law',
      content:
        'These Terms and Conditions are governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the Karimganj Court, Assam, India.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-[#1A2B4A] mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-lg text-[#4A5568]">
            Please read these terms carefully before using our services.
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
            If you have any questions about these Terms &amp; Conditions, please contact us at{' '}
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
