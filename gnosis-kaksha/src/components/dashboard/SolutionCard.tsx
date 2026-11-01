'use client';

import { Download, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { Badge } from '@/components/dashboard/Badge';

export interface Solution {
  id: string;
  doubtId: string | null;
  teacherName: string;
  branchName: string | null;
  classNumber: number;
  subject: string;
  title: string;
  note: string | null;
  linkUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: 'image' | 'pdf' | 'video' | null;
  fileSize: string | null;
  createdAt: string;
}

/** A posted doubt solution, shown to students and to the teacher who posted it. */
export function SolutionCard({ s, onDelete }: { s: Solution; onDelete?: () => void }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#1A2B4A]">{s.title}</p>
          <p className="text-xs text-gray-500">
            {s.subject} · Class {s.classNumber}{s.branchName ? ` · ${s.branchName}` : ''} · {s.teacherName} · {new Date(s.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {s.doubtId && <Badge tone="green">Answers a doubt</Badge>}
          {onDelete && (
            <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Delete solution">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      {s.note && <p className="mb-3 whitespace-pre-line text-sm text-[#4A5568]">{s.note}</p>}
      {s.fileUrl && s.fileType === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element -- auth-gated API file
        <img src={s.fileUrl} alt={s.title} className="mb-3 max-h-96 rounded-lg border border-gray-200 object-contain" />
      )}
      {s.fileUrl && s.fileType === 'video' && <video src={s.fileUrl} controls preload="metadata" className="mb-3 max-h-96 w-full rounded-lg bg-black" />}
      <div className="flex flex-wrap gap-3 text-sm">
        {s.fileUrl && (
          <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#1295D8] hover:underline">
            {s.fileType === 'pdf' ? <FileText size={15} /> : <Download size={15} />} {s.fileName}{s.fileSize ? ` (${s.fileSize})` : ''}
          </a>
        )}
        {s.linkUrl && (
          <a href={s.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#1295D8] hover:underline">
            <ExternalLink size={15} /> Watch video solution
          </a>
        )}
      </div>
    </article>
  );
}
