"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";

interface CVUploadProps {
  onUploadSuccess?: () => void;
  onAnalysisStart?: (cvId: string) => void;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hasAcceptedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function validateFile(file: File): string | null {
  if (file.size <= 0) {
    return "Please choose a file to upload.";
  }

  const typeIsValid =
    ACCEPTED_MIME_TYPES.has(file.type) || hasAcceptedExtension(file.name);

  if (!typeIsValid) {
    return "Only PDF and DOCX files are supported.";
  }

  if (file.size > MAX_SIZE_BYTES) {
    return "File size must be 10MB or less.";
  }

  return null;
}

export default function CVUpload({ onUploadSuccess, onAnalysisStart }: CVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileSize, setSelectedFileSize] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posthog = usePostHog();

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const clearSelectedFile = useCallback(() => {
    setSelectedFileName("");
    setSelectedFileSize("");
    resetFileInput();
  }, [resetFileInput]);

  const handleFile = useCallback(
    async (selectedFile: File) => {
      const validationError = validateFile(selectedFile);

      if (validationError) {
        setError(validationError);
        clearSelectedFile();
        toast.error(validationError);
        return;
      }

      setError("");
      setSelectedFileName(selectedFile.name);
      setSelectedFileSize(formatFileSize(selectedFile.size));
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          const message = data.error || "Upload failed";
          
          if (response.status === 401 && data.retryAfter) {
            toast.info("Initializing your profile...");
            // Small wait and then could potentially auto-retry or just show message
            setError("Setting up your account. Please click upload again in a few seconds.");
            return;
          }

          setError(message);
          toast.error(message);
          return;
        }

        posthog?.capture("cv_uploaded", {
          file_type: selectedFile.type || selectedFile.name.split(".").pop(),
          file_size_bytes: selectedFile.size,
        });
        toast.success("CV uploaded successfully!");
        clearSelectedFile();
        if (data.id && onAnalysisStart) {
          onAnalysisStart(data.id);
        } else if (onUploadSuccess) {
          onUploadSuccess();
        }
      } catch {
        const message = "Upload failed. Try again.";
        setError(message);
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [clearSelectedFile, onUploadSuccess, onAnalysisStart, posthog],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);

      if (uploading) return;

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        void handleFile(droppedFile);
      }
    },
    [handleFile, uploading],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragging
            ? "border-emerald-400 bg-emerald-500/10"
            : "border-slate-700 hover:border-slate-600"
        } ${uploading ? "opacity-80" : ""}`}
        aria-busy={uploading}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10">
          <svg
            className="h-7 w-7 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-white">Upload your CV</h3>
        <p className="mt-1 text-sm text-slate-400">
          Drag and drop or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-emerald-400 transition-colors hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            browse
          </button>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          PDF or DOCX only, up to 5MB
        </p>

        {selectedFileName && (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {selectedFileName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedFileSize}
                </p>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="text-xs text-slate-400 transition-colors hover:text-white"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        {uploading && (
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-slate-700">
              <div className="h-2 w-1/2 animate-pulse rounded-full bg-emerald-500" />
            </div>
            <p className="mt-2 text-sm text-emerald-400">
              Uploading and analyzing your CV...
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h4 className="text-sm font-medium text-white">What happens next?</h4>
        <ul className="mt-2 space-y-2 text-sm text-slate-400">
          <li>• We securely upload your CV</li>
          <li>• We extract skills, education, and experience</li>
          <li>• You can use it for job matching and fit analysis</li>
        </ul>
      </div>
    </div>
  );
}
