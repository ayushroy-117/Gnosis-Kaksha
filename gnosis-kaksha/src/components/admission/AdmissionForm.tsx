'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { BillingSidebar } from './BillingSidebar';
import toast from 'react-hot-toast';

// Validation schemas for each step
const step1Schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  dob: z.string().min(1, 'Date of birth is required'),
});

const step2Schema = z.object({
  currentClass: z.string().min(1, 'Current class is required'),
  schoolName: z.string().min(2, 'School name is required'),
  previousPercentage: z.string().min(1, 'Previous percentage is required'),
});

const step3Schema = z.object({
  subjects: z.array(z.string()).min(1, 'Select at least one subject'),
});

const step4Schema = z.object({
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),
  parentName: z.string().min(2, 'Parent name is required'),
  parentPhone: z.string().min(10, 'Valid phone number is required'),
});

const step5Schema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentFile: z.any().optional(),
});

const step6Schema = z.object({
  agreeTerms: z.boolean().refine(val => val === true, 'You must agree to terms'),
  tshirtSize: z.string().min(1, 'T-shirt size is required'),
});

const CLASSES = Array.from({ length: 8 }, (_, i) => ({ value: (i + 5).toString(), label: `Class ${i + 5}` }));
const SUBJECTS_BY_CLASS: Record<number, string[]> = {
  5: ['Mathematics', 'Science', 'English', 'Bengali', 'Social Science'],
  6: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science'],
  7: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science'],
  8: ['Mathematics', 'Science', 'English', 'Social Science'],
  9: ['Mathematics', 'Science', 'English', 'Social Science'],
  10: ['Mathematics', 'Science', 'English', 'Social Science'],
  11: ['English', 'History', 'Geography', 'Economics'],
  12: ['English', 'History', 'Geography', 'Economics'],
};

export function AdmissionForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver([step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6Schema][currentStep - 1]),
    mode: 'onChange',
  });

  // Type-safe error accessor
  const errors = form.formState.errors as any;

  const handleNext = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const data = form.getValues();
      setFormData({ ...formData, ...data });
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
        form.reset();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const data = form.getValues();
      setFormData({ ...formData, ...data });
      setCurrentStep(currentStep - 1);
      form.reset(formData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) return;

    const data = form.getValues();
    const finalData = { ...formData, ...data };

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      if (response.ok) {
        toast.success('Admission form submitted successfully!');
        form.reset();
        setFormData({});
        setCurrentStep(1);
      } else {
        toast.error('Failed to submit form. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubjectsForClass = () => {
    const classValue = parseInt(formData.currentClass || '5');
    return (SUBJECTS_BY_CLASS[classValue] || []).map(s => ({ value: s, label: s }));
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-2">
        <Card className="p-8">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div
                  key={step}
                  className={`flex flex-col items-center ${step !== 6 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                      currentStep >= step
                        ? 'bg-[#1295D8] text-white'
                        : 'bg-[#CDE6F7] text-[#1295D8]'
                    }`}
                  >
                    {currentStep > step ? <CheckCircle className="h-6 w-6" /> : step}
                  </div>
                  <p className="text-xs mt-2 text-center font-medium text-[#718096]">Step {step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#1A2B4A]">Personal Information</h2>
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  {...form.register('fullName')}
                  error={(form.formState.errors as any).fullName?.message}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  {...form.register('email')}
                  error={(form.formState.errors as any).email?.message}
                />
                <Input
                  label="Phone Number"
                  placeholder="+91 9876543210"
                  {...form.register('phone')}
                  error={errors.phone?.message}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  {...form.register('dob')}
                  error={errors.dob?.message}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#1A2B4A]">Academic Information</h2>
                <Select
                  label="Current Class"
                  options={CLASSES}
                  {...form.register('currentClass')}
                  error={errors.currentClass?.message}
                />
                <Input
                  label="School Name"
                  placeholder="ABC High School"
                  {...form.register('schoolName')}
                  error={errors.schoolName?.message}
                />
                <Input
                  label="Previous Year Percentage (%)"
                  type="number"
                  placeholder="85"
                  {...form.register('previousPercentage')}
                  error={errors.previousPercentage?.message}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#1A2B4A]">Select Subjects</h2>
                <div className="space-y-3">
                  {getSubjectsForClass().map((subject) => (
                    <label key={subject.value} className="flex items-center p-3 border-2 border-gray-300 rounded-lg hover:border-[#1295D8] cursor-pointer transition">
                      <input
                        type="checkbox"
                        value={subject.value}
                        {...form.register('subjects')}
                        className="w-5 h-5"
                      />
                      <span className="ml-3">{subject.label}</span>
                    </label>
                  ))}
                </div>
                {errors.subjects && (
                  <p className="text-red-600">{errors.subjects.message}</p>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#1A2B4A]">Address Information</h2>
                <Input
                  label="Address"
                  placeholder="123 Main Street"
                  {...form.register('address')}
                  error={errors.address?.message}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    placeholder="Kolkata"
                    {...form.register('city')}
                    error={errors.city?.message}
                  />
                  <Input
                    label="State"
                    placeholder="West Bengal"
                    {...form.register('state')}
                    error={errors.state?.message}
                  />
                </div>
                <Input
                  label="Pincode"
                  placeholder="700001"
                  {...form.register('pincode')}
                  error={errors.pincode?.message}
                />
                <Input
                  label="Parent Name"
                  placeholder="Jane Doe"
                  {...form.register('parentName')}
                  error={errors.parentName?.message}
                />
                <Input
                  label="Parent Phone"
                  placeholder="+91 9876543210"
                  {...form.register('parentPhone')}
                  error={errors.parentPhone?.message}
                />
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#1A2B4A]">Upload Documents</h2>
                <Select
                  label="Document Type"
                  options={[
                    { value: 'marksheet', label: 'Previous Year Marksheet' },
                    { value: 'certificate', label: 'Transfer Certificate' },
                    { value: 'idproof', label: 'ID Proof' },
                  ]}
                  {...form.register('documentType')}
                  error={errors.documentType?.message}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Document
                  </label>
                  <input
                    type="file"
                    {...form.register('documentFile')}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg focus:border-purple-600 transition"
                  />
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Review & Confirm</h2>
                <Select
                  label="T-Shirt Size"
                  options={[
                    { value: 'xs', label: 'Extra Small' },
                    { value: 's', label: 'Small' },
                    { value: 'm', label: 'Medium' },
                    { value: 'l', label: 'Large' },
                    { value: 'xl', label: 'Extra Large' },
                  ]}
                  {...form.register('tshirtSize')}
                  error={errors.tshirtSize?.message}
                />
                <label className="flex items-start p-4 border-2 border-gray-300 rounded-lg hover:border-[#1295D8] cursor-pointer transition">
                  <input
                    type="checkbox"
                    {...form.register('agreeTerms')}
                    className="w-5 h-5 mt-1"
                  />
                  <span className="ml-3">I agree to the terms and conditions of Gnosis Kaksha</span>
                </label>
                {errors.agreeTerms && (
                  <p className="text-red-600">{errors.agreeTerms.message}</p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-5 w-5" /> Previous
                </Button>
              )}
              {currentStep < 6 ? (
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleNext}
                >
                  Next <ChevronRight className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={isSubmitting}
                >
                  Submit Application
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* Sidebar */}
      <div>
        <BillingSidebar
          currentClass={formData.currentClass}
          selectedSubjects={formData.subjects}
          previousPercentage={formData.previousPercentage}
        />
      </div>
    </div>
  );
}
