/**
 * Study material shapes, as returned by GET /api/study-material.
 * Files live in the database and download via /api/study-material/<id>/download
 * (sign-in required).
 */

export type MaterialCategory = 'Notes' | 'PYQ' | 'Worksheet' | 'Formula Sheet' | 'Syllabus';

export const MATERIAL_CATEGORIES: MaterialCategory[] = ['Notes', 'PYQ', 'Worksheet', 'Formula Sheet', 'Syllabus'];

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  classNumber: number;
  subject: string;
  category: MaterialCategory;
  fileUrl: string;
  fileName?: string;
  fileSize: string;
  fileType: 'PDF' | 'DOCX' | 'ZIP';
  uploadedBy: string;
  createdAt: string;
  downloads: number;
  isFeatured?: boolean;
}
