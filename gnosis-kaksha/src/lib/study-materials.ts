/**
 * lib/study-materials.ts
 * Data model, seeded materials, and storage helpers for Gnosis Kaksha Study Materials.
 */

export type MaterialCategory =
  | 'Notes'
  | 'PYQ'
  | 'Worksheet'
  | 'Formula Sheet'
  | 'Syllabus';

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  classNumber: number;
  subject: string;
  category: MaterialCategory;
  fileUrl: string;
  fileSize: string;
  fileType: 'PDF' | 'DOCX' | 'ZIP';
  uploadedBy: string;
  createdAt: string;
  downloads: number;
  isFeatured?: boolean;
}

export const INITIAL_STUDY_MATERIALS: StudyMaterial[] = [
  {
    id: 'mat-01',
    title: 'Class 10 Mathematics: Real Numbers & Polynomials Complete Notes',
    description: 'Comprehensive handwritten chapter summary, key theorems, solved NCERT exemplar questions, and practice problems.',
    classNumber: 10,
    subject: 'Mathematics',
    category: 'Notes',
    fileUrl: '/materials/class10-math-real-numbers.pdf',
    fileSize: '3.4 MB',
    fileType: 'PDF',
    uploadedBy: 'Joydeep Dey (Maths Faculty)',
    createdAt: '2026-09-01',
    downloads: 342,
    isFeatured: true,
  },
  {
    id: 'mat-02',
    title: 'Class 10 Science: Chemical Reactions & Equations Master Formula Sheet',
    description: 'All balanced equations, types of reactions, oxidation-reduction rules, and reaction colors cheat sheet.',
    classNumber: 10,
    subject: 'Science',
    category: 'Formula Sheet',
    fileUrl: '/materials/class10-science-chemical-reactions.pdf',
    fileSize: '1.8 MB',
    fileType: 'PDF',
    uploadedBy: 'Ankur Kumar Nath (Founder & Science)',
    createdAt: '2026-09-03',
    downloads: 418,
    isFeatured: true,
  },
  {
    id: 'mat-03',
    title: 'Class 10 SEBA Board: 5-Year Solved Mathematics Question Papers (2021-2025)',
    description: 'Official board question papers with step-by-step model solutions and marking scheme breakdown.',
    classNumber: 10,
    subject: 'Mathematics',
    category: 'PYQ',
    fileUrl: '/materials/class10-math-seba-pyq.pdf',
    fileSize: '8.2 MB',
    fileType: 'PDF',
    uploadedBy: 'Sanjib Paul (Maths Faculty)',
    createdAt: '2026-08-20',
    downloads: 620,
    isFeatured: true,
  },
  {
    id: 'mat-04',
    title: 'Class 12 Physics: Electrostatics & Electric Potential Deep Dive',
    description: 'Derivations of Gauss law, electric dipole in external fields, capacitor combinations, and numerical problem bank.',
    classNumber: 12,
    subject: 'Physics',
    category: 'Notes',
    fileUrl: '/materials/class12-physics-electrostatics.pdf',
    fileSize: '4.6 MB',
    fileType: 'PDF',
    uploadedBy: 'Ankur Kumar Nath (Physics Faculty)',
    createdAt: '2026-09-05',
    downloads: 285,
    isFeatured: true,
  },
  {
    id: 'mat-05',
    title: 'Class 12 Biology: Genetics & Molecular Basis of Inheritance',
    description: 'Mendelian inheritance crosses, DNA replication mechanism diagrams, lac operon explanation, and genetic disorders.',
    classNumber: 12,
    subject: 'Biology',
    category: 'Notes',
    fileUrl: '/materials/class12-biology-genetics.pdf',
    fileSize: '5.1 MB',
    fileType: 'PDF',
    uploadedBy: 'Barnali Paul (Biology Gold Medalist)',
    createdAt: '2026-09-08',
    downloads: 195,
  },
  {
    id: 'mat-06',
    title: 'Class 9 Mathematics: Lines and Angles Practice Worksheet',
    description: '30 challenging geometry proof questions with progressive difficulty from NCERT & RD Sharma.',
    classNumber: 9,
    subject: 'Mathematics',
    category: 'Worksheet',
    fileUrl: '/materials/class9-math-lines-angles.pdf',
    fileSize: '2.1 MB',
    fileType: 'PDF',
    uploadedBy: 'Joydeep Dey (Maths Faculty)',
    createdAt: '2026-09-10',
    downloads: 154,
  },
  {
    id: 'mat-07',
    title: 'Class 10 English: Grammar Rules, Formal Letters & Analytical Paragraphs',
    description: 'Rules for reported speech, passive voice conversions, format guidelines for formal letters and analytical paragraph writing.',
    classNumber: 10,
    subject: 'English',
    category: 'Notes',
    fileUrl: '/materials/class10-english-grammar.pdf',
    fileSize: '2.9 MB',
    fileType: 'PDF',
    uploadedBy: 'Anal Choudhury (English Faculty)',
    createdAt: '2026-09-12',
    downloads: 230,
  },
  {
    id: 'mat-08',
    title: 'Class 11 Chemistry: Structure of Atom & Periodic Classification',
    description: 'Quantum numbers, Hund rule, Pauli exclusion principle, electronic configurations, and periodic trends summary table.',
    classNumber: 11,
    subject: 'Chemistry',
    category: 'Notes',
    fileUrl: '/materials/class11-chemistry-atom.pdf',
    fileSize: '3.7 MB',
    fileType: 'PDF',
    uploadedBy: 'Ankur Kumar Nath (Science Faculty)',
    createdAt: '2026-09-04',
    downloads: 210,
  },
  {
    id: 'mat-09',
    title: 'Class 10 Board Exam Blueprint & Weightage Distribution (2026-27)',
    description: 'Official chapter-wise marks distribution, internal assessment breakdown, and high-scoring topic strategy.',
    classNumber: 10,
    subject: 'All Subjects',
    category: 'Syllabus',
    fileUrl: '/materials/class10-board-blueprint.pdf',
    fileSize: '1.2 MB',
    fileType: 'PDF',
    uploadedBy: 'Principal / Admin',
    createdAt: '2026-08-15',
    downloads: 540,
    isFeatured: true,
  },
  {
    id: 'mat-10',
    title: 'Class 11 Physics: Kinematics & Laws of Motion Numerical DPP',
    description: 'Daily practice problem sheet containing 25 calculus-based motion numericals with hint sheet.',
    classNumber: 11,
    subject: 'Physics',
    category: 'Worksheet',
    fileUrl: '/materials/class11-physics-kinematics.pdf',
    fileSize: '2.5 MB',
    fileType: 'PDF',
    uploadedBy: 'Ankur Kumar Nath (Physics Faculty)',
    createdAt: '2026-09-11',
    downloads: 180,
  },
];

const STORAGE_KEY = 'gk_study_materials';

export function getAllStudyMaterials(): StudyMaterial[] {
  if (typeof window === 'undefined') {
    return INITIAL_STUDY_MATERIALS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STUDY_MATERIALS));
      return INITIAL_STUDY_MATERIALS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_STUDY_MATERIALS;
  }
}

export function saveStudyMaterials(items: StudyMaterial[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save study materials to storage:', err);
  }
}

export function addStudyMaterial(
  data: Omit<StudyMaterial, 'id' | 'createdAt' | 'downloads'>
): StudyMaterial {
  const current = getAllStudyMaterials();
  const newMaterial: StudyMaterial = {
    ...data,
    id: `mat-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString().split('T')[0],
    downloads: 0,
  };

  const updated = [newMaterial, ...current];
  saveStudyMaterials(updated);
  return newMaterial;
}

export function deleteStudyMaterial(id: string): boolean {
  const current = getAllStudyMaterials();
  const updated = current.filter((m) => m.id !== id);
  if (updated.length !== current.length) {
    saveStudyMaterials(updated);
    return true;
  }
  return false;
}

export function incrementDownloadCount(id: string): number {
  const current = getAllStudyMaterials();
  let count = 0;
  const updated = current.map((m) => {
    if (m.id === id) {
      count = m.downloads + 1;
      return { ...m, downloads: count };
    }
    return m;
  });
  saveStudyMaterials(updated);
  return count;
}
