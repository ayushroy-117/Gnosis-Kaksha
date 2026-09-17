'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Download, Loader2, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type OutputType = 'rgba' | 'white';

export default function BgRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<OutputType>('rgba');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(f.type)) {
      setError('Only JPG and PNG files are supported.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File size must be 5 MB or less.');
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleRemove = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append('image', file);
      form.append('output_type', outputType);

      const res = await fetch('/api/bg-remove', { method: 'POST', body: form });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Server error ${res.status}`);
      }

      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message || 'Background removal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = `removed-bg-${Date.now()}.png`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-[#1295D8] font-bold text-sm uppercase tracking-widest">
            Free Tool
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-[#1A2B4A] mt-3 mb-4">
            Image Background Remover
          </h1>
          <p className="text-xl text-[#4A5568] max-w-xl mx-auto">
            Upload a JPG or PNG, remove the background in seconds.
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-[#1295D8] to-orange-400 mx-auto mt-6" />
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['Drag and drop support', '5 MB secure upload limit', 'Transparent PNG & white background export'].map((b) => (
            <span key={b} className="bg-blue-50 border border-blue-200 text-[#1295D8] text-sm font-semibold px-4 py-1.5 rounded-full">
              ✓ {b}
            </span>
          ))}
        </div>

        {/* Best for */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 text-center">
          <p className="text-[#4A5568] font-medium">
            <span className="text-[#1A2B4A] font-bold">Best for:</span> Student ID photos, profile pictures, admission form assets &nbsp;|&nbsp;
            <span className="text-[#1A2B4A] font-bold">Formats:</span> JPG, PNG &nbsp;|&nbsp;
            <span className="text-[#1A2B4A] font-bold">Output:</span> PNG &nbsp;|&nbsp;
            <span className="text-[#1A2B4A] font-bold">Limit:</span> 5 MB
          </p>
        </div>

        {/* Upload area */}
        <div
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition cursor-pointer mb-8
            ${dragOver ? 'border-[#1295D8] bg-blue-50' : 'border-gray-300 hover:border-[#1295D8] hover:bg-blue-50'}
            ${file ? 'cursor-default' : ''}`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <ImageIcon className="h-6 w-6 text-[#1295D8]" />
              <span className="text-[#1A2B4A] font-semibold">{file.name}</span>
              <span className="text-[#718096] text-sm">({(file.size / 1024).toFixed(0)} KB)</span>
              <button onClick={(e) => { e.stopPropagation(); reset(); }} className="ml-2 text-red-400 hover:text-red-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-[#1295D8] mx-auto mb-4" />
              <p className="text-lg font-semibold text-[#1A2B4A] mb-1">Drop your image here or click to browse</p>
              <p className="text-[#718096] text-sm">JPG or PNG, max 5 MB</p>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png" onChange={onInputChange} className="hidden" />
        </div>

        {/* Output type toggle */}
        {file && (
          <div className="flex justify-center gap-4 mb-8">
            {(['rgba', 'white'] as OutputType[]).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="outputType"
                  value={type}
                  checked={outputType === type}
                  onChange={() => setOutputType(type)}
                  className="accent-[#1295D8]"
                />
                <span className="font-medium text-[#1A2B4A]">
                  {type === 'rgba' ? 'Transparent PNG' : 'White background version'}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-center font-medium">
            {error}
          </div>
        )}

        {/* Remove Background button */}
        {file && (
          <div className="flex justify-center mb-10">
            <Button
              onClick={handleRemove}
              disabled={loading}
              size="lg"
              className="bg-gradient-to-r from-[#1295D8] to-blue-600 text-white px-12 hover:shadow-xl transform hover:scale-105 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing your image, please wait...
                </span>
              ) : (
                'Remove Background'
              )}
            </Button>
          </div>
        )}

        {/* Preview area */}
        {(preview || result) && (
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Original */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-[#1A2B4A] mb-4 text-center">Original Preview</h3>
              {preview && (
                <img src={preview} alt="Original" className="w-full rounded-xl object-contain max-h-72" />
              )}
            </div>

            {/* Result */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-[#1A2B4A] mb-4 text-center">Processed Result</h3>
              {result ? (
                <>
                  <div className={`rounded-xl overflow-hidden mb-4 ${outputType === 'rgba' ? 'bg-[url(/checker.png)] bg-repeat' : 'bg-white'}`}>
                    <img src={result} alt="Result" className="w-full object-contain max-h-72" />
                  </div>
                  <Button
                    onClick={handleDownload}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg transition"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Result
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-[#718096] text-sm">
                  Result will appear here after processing
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
