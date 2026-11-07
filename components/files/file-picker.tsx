"use client";

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File as FileIcon,
  X,
  Trash2,
  Plus,
} from "lucide-react";
import { SelectedFileItem } from "@/lib/types";
import { formatBytes, getFileCategory } from "@/lib/file/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const baseClass = cn("size-5 shrink-0", className);

  switch (category) {
    case "image":
      return <FileImage className={cn(baseClass, "text-pink-500")} />;
    case "video":
      return <FileVideo className={cn(baseClass, "text-purple-500")} />;
    case "audio":
      return <FileAudio className={cn(baseClass, "text-amber-500")} />;
    case "pdf":
      return <FileText className={cn(baseClass, "text-red-500")} />;
    case "archive":
      return <FileArchive className={cn(baseClass, "text-orange-500")} />;
    case "document":
      return <FileText className={cn(baseClass, "text-blue-500")} />;
    case "code":
      return <FileCode className={cn(baseClass, "text-emerald-500")} />;
    default:
      return <FileIcon className={cn(baseClass, "text-teal-500")} />;
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
          "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all",
          isDragging
            ? "border-teal-500 bg-teal-500/10 scale-[1.005]"
            : "border-border hover:border-teal-500/60 hover:bg-muted/40",
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

        <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 transition-transform group-hover:scale-105 dark:text-teal-400">
          <UploadCloud className="size-7" />
        </div>

        <h4 className="mt-3 text-base font-semibold text-foreground">
          Drag & drop files here, or click to browse
        </h4>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Supports images, videos, audio, PDFs, documents, ZIP archives, and
          large files (streamed in 64 KB chunks without loading the full file
          into memory).
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {["Images", "Videos", "Audio", "PDFs", "Documents", "ZIP Archives"].map(
            (label) => (
              <Badge key={label} variant="secondary" className="text-[11px]">
                {label}
              </Badge>
            )
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Selected Files ({files.length})
              </span>
              <Badge variant="default">{formatBytes(totalBytes)} Total</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                <Plus className="size-3" />
                Add More
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={disabled}
                onClick={onClearAll}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
                Clear All
              </Button>
            </div>
          </div>

          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {files.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/25 px-3 py-2.5 transition-colors hover:bg-muted/45"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileCategoryIcon
                    mimeType={item.type}
                    fileName={item.name}
                  />
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium text-foreground"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size)} •{" "}
                      {Math.max(1, Math.ceil(item.size / (64 * 1024)))} chunks
                    </p>
                  </div>
                </div>

                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onRemoveFile(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

