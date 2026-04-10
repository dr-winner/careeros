"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  versionLabel: string;
}

interface CVUploadProps {
  onUploadSuccess?: () => void;
}

export default function CVUpload({ onUploadSuccess }: CVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (selectedFile: File) => {
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("CV uploaded successfully!");
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        setError(data.error || "Upload failed");
        toast.error(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed. Try again.");
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }, [handleFile]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
        dragging
          ? "border-emerald-400 bg-emerald-500/10"
          : "border-slate-700 hover:border-slate-600"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc"
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-emerald-500/10 mb-4">
        <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-white">Upload your CV</h3>
      <p className="mt-1 text-sm text-slate-400">
        Drag and drop or{" "}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          browse
        </button>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Word documents (DOCX) up to 5MB
      </p>

      {uploading && (
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-slate-700">
            <div className="h-2 w-1/2 animate-pulse rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-sm text-emerald-400">Uploading...</p>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
