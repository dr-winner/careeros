"use client";

import { useState, useRef } from "react";

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  versionLabel: string;
}

export default function CVUpload() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File) => {
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
        setFile({
          id: data.id,
          filename: data.filename,
          originalName: data.originalName,
          size: data.size,
          versionLabel: data.versionLabel,
        });
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (file) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{file.originalName}</p>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/30">
                {file.versionLabel}
              </span>
            </div>
            <p className="text-sm text-slate-400">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Remove
          </button>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 w-full rounded-lg border border-dashed border-slate-600 py-3 text-sm text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
        >
          Upload a different file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  }

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
        accept=".pdf,.doc,.docx"
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
        PDF, DOC, DOCX up to 5MB
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
