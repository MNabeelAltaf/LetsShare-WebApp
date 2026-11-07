"use client";

import React, { useRef, useState } from "react";
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File as FileIcon,
  X,
  Plus,
} from "lucide-react";
import { SelectedFileItem } from "@/lib/types";
import { formatBytes, getFileCategory } from "@/lib/file/format";
import { cn } from "@/lib/utils";

interface FilePickerProps {
  files: SelectedFileItem[];
  totalBytes: number;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export function FileCategoryIcon({
  mimeType,
  fileName,
  className,
}: {
  mimeType: string;
  fileName: string;
  className?: string;
}) {
  const category = getFileCategory(mimeType, fileName);
  const baseClass = cn("size-4 shrink-0 text-primary", className);

  switch (category) {
    case "image":
      return <FileImage className={baseClass} />;
    case "video":
      return <FileVideo className={baseClass} />;
    case "audio":
      return <FileAudio className={baseClass} />;
    case "pdf":
      return <FileText className={baseClass} />;
    case "archive":
      return <FileArchive className={baseClass} />;
    case "document":
      return <FileText className={baseClass} />;
    case "code":
      return <FileCode className={baseClass} />;
    default:
      return <FileIcon className={baseClass} />;
  }
}

export function FilePicker({
  files,
  totalBytes,
  onAddFiles,
  onRemoveFile,
  onClearAll,
  disabled = false,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/40",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-bold text-background">
          <Plus className="size-4" />
          Choose Files
        </span>

        <p className="mt-3 text-xs text-muted-foreground">
          Tap to pick photos, videos, or documents
        </p>
      </div>

      {files.length > 0 && (
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-xs font-bold text-foreground">
              {files.length} {files.length === 1 ? "file" : "files"} •{" "}
              {formatBytes(totalBytes)}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="text-xs font-bold text-primary hover:underline"
              >
                + Add
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onClearAll}
                className="text-xs font-medium text-muted-foreground hover:text-destructive"
              >
                Clear
              </button>
            </div>
          </div>

          <ul className="divide-y divide-border max-h-60 overflow-y-auto">
            {files.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <FileCategoryIcon
                    mimeType={item.type}
                    fileName={item.name}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs font-semibold text-foreground"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(item.size)}
                    </p>
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
