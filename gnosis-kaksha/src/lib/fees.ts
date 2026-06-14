// lib/fees.ts - Single source of truth for all fee calculations

export const EXAM_FEE = 350; // ₹ fixed, always added
export const TSHIRT_FEE = 600; // ₹ fixed, always added (size selection is cosmetic)

// Monthly tuition per subject by class
export const SUBJECT_FEES: Record<number, Record<string, number>> = {
  5: {
    Mathematics: 500,
    Science: 500,
    English: 500,
    Bengali: 400,
    "Social Science": 400,
  },
  6: {
    Mathematics: 500,
    Science: 500,
    English: 500,
    Bengali: 400,
    "Social Science": 400,
  },
  7: {
    Mathematics: 550,
    Science: 550,
    English: 500,
    Bengali: 400,
    "Social Science": 400,
  },
  8: {
    Mathematics: 600,
    Science: 600,
    English: 500,
    Bengali: 450,
    "Social Science": 450,
  },
  9: {
    Mathematics: 650,
    Science: 650,
    English: 550,
    Bengali: 450,
    History: 450,
  },
  10: {
    Mathematics: 700,
    Science: 700,
    English: 600,
    Bengali: 500,
    History: 500,
  },
  11: {
    // Science stream
    Physics: 800,
    Chemistry: 800,
    Biology: 800,
    Mathematics: 800,
    English: 600,
    // Arts stream
    History: 650,
    "Political Science": 650,
    Economics: 700,
    Bengali: 500,
  },
  12: {
    Physics: 900,
    Chemistry: 900,
    Biology: 900,
    Mathematics: 900,
    English: 650,
    History: 700,
    "Political Science": 700,
    Economics: 750,
    Bengali: 550,
  },
};

// Subjects available by class and stream
export const AVAILABLE_SUBJECTS: Record<string, string[]> = {
  "5": ["Mathematics", "Science", "English", "Bengali", "Social Science"],
  "6": ["Mathematics", "Science", "English", "Bengali", "Social Science"],
  "7": ["Mathematics", "Science", "English", "Bengali", "Social Science"],
  "8": ["Mathematics", "Science", "English", "Bengali", "Social Science"],
  "9": ["Mathematics", "Science", "English", "Bengali", "History"],
  "10": ["Mathematics", "Science", "English", "Bengali", "History"],
  "11-Science": ["Physics", "Chemistry", "Biology", "Mathematics", "English"],
  "11-Arts": ["History", "Political Science", "Economics", "English", "Bengali"],
  "12-Science": ["Physics", "Chemistry", "Biology", "Mathematics", "English"],
  "12-Arts": ["History", "Political Science", "Economics", "English", "Bengali"],
};

// Scholarship rules: auto-calculated from previous class percentage
export function calculateScholarship(prevPercentage: number): number {
  if (prevPercentage >= 90) return 30; // 30% discount
  if (prevPercentage >= 80) return 20; // 20% discount
  if (prevPercentage >= 70) return 10; // 10% discount
  return 0;
}

// Calculate everything from selected subjects + scholarship %
export function calculateBill(
  selectedSubjects: { name: string; monthly_fee: number }[],
  scholarshipPercent: number
) {
  const monthlyTuition = selectedSubjects.reduce(
    (sum, s) => sum + s.monthly_fee,
    0
  );
  const scholarshipAmount = Math.round(
    (monthlyTuition * scholarshipPercent) / 100
  );
  const tuitionAfterScholarship = monthlyTuition - scholarshipAmount;
  const mandatoryCharges = EXAM_FEE + TSHIRT_FEE;
  const finalPayable = tuitionAfterScholarship + mandatoryCharges;

  return {
    monthlyTuition,
    scholarshipAmount,
    tuitionAfterScholarship,
    mandatoryCharges,
    finalPayable,
  };
}
