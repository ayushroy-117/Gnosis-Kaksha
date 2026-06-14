'use client';

import { Card } from '@/components/ui/Card';
import { calculateBill, calculateScholarship, SUBJECT_FEES } from '@/lib/fees';
import { useMemo } from 'react';

interface BillingSidebarProps {
  currentClass?: string;
  selectedSubjects?: string[];
  previousPercentage?: string;
}

export function BillingSidebar({
  currentClass,
  selectedSubjects,
  previousPercentage,
}: BillingSidebarProps) {
  const billing = useMemo(() => {
    if (!currentClass || !selectedSubjects || !previousPercentage) {
      return null;
    }

    const classNum = parseInt(currentClass);
    const subjectFees = SUBJECT_FEES[classNum] || {};
    const percentage = parseInt(previousPercentage);
    const scholarship = calculateScholarship(percentage);

    const selectedSubjectsData = selectedSubjects.map((subject) => ({
      name: subject,
      monthly_fee: subjectFees[subject] || 0,
    }));

    return calculateBill(selectedSubjectsData, scholarship);
  }, [currentClass, selectedSubjects, previousPercentage]);

  if (!billing) {
    return (
      <Card className="sticky top-20 p-6">
        <h3 className="text-xl font-bold mb-4 text-[#1A2B4A]">Fee Breakdown</h3>
        <p className="text-gray-600">Complete the form to see billing details</p>
      </Card>
    );
  }

  return (
    <Card className="sticky top-20 p-6 bg-[#CDE6F7] border-2 border-[#50B4F2]">
      <h3 className="text-xl font-bold mb-6 text-[#1A2B4A]">Fee Breakdown</h3>

      <div className="space-y-4 mb-6 pb-6 border-b-2 border-gray-200">
        <div className="flex justify-between">
          <span className="text-[#4A5568]">Monthly Tuition:</span>
          <span className="font-semibold text-[#1A2B4A]">₹{billing.monthlyTuition}</span>
        </div>

        {billing.scholarshipAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Scholarship Discount:</span>
            <span className="font-semibold">-₹{billing.scholarshipAmount}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-[#4A5568]">After Scholarship:</span>
          <span className="font-semibold text-[#1A2B4A]">₹{billing.tuitionAfterScholarship}</span>
        </div>

        <div className="bg-white p-3 rounded-lg">
          <p className="text-xs text-[#718096] mb-2">Mandatory Charges:</p>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>• Exam Fee:</span>
              <span>₹350</span>
            </div>
            <div className="flex justify-between">
              <span>• T-Shirt:</span>
              <span>₹600</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-linear-to-r from-[#2E5EAA] to-[#1295D8] text-white rounded-lg p-4">
        <p className="text-sm font-medium mb-2">Monthly Payable Amount</p>
        <p className="text-3xl font-bold">₹{billing.finalPayable}</p>
        <p className="text-xs mt-2 opacity-90">First month includes exam fee & t-shirt</p>
      </div>

      {previousPercentage && parseInt(previousPercentage) >= 70 && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
          <p className="text-sm font-semibold text-green-800">✓ Eligible for Scholarship</p>
          <p className="text-xs text-green-700 mt-1">
            Your previous performance qualifies you for scholarship benefits!
          </p>
        </div>
      )}
    </Card>
  );
}
