/* agent-frontmatter:start
AGENT: Blob files hook
PURPOSE: Handle file validation and upload for blob storage
USAGE: const { files, setFiles, processFiles, clearFiles, isUploading, uploadTiming } = useBlobFiles(client)
EXPORTS: useBlobFiles, UseBlobFilesResult
FEATURES:
  - Automatic file processing: upload to blob if enabled, return FileList if disabled
  - Built-in validation against blob constraints
  - Handles base64 encoding and ORPC upload internally
  - Support for immediate and onSubmit upload timing strategies
  - Immediate mode: auto-upload on file selection
  - OnSubmit mode: upload on manual processFiles() call
  - Error handling with clear error messages
SEARCHABLE: blob files, file upload hook, blob validation, processFiles, immediate upload, onSubmit upload
agent-frontmatter:end */

"use client";

import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { FileUIPart } from "ai";
import { isFileUIPart } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentStartAPI } from "@/api";

/**
 * Validation error for file constraints
 */
interface ValidationError {
  field: string;
  message: string;
  constraint: string;
}

/**
 * File data for upload
 */
interface FileUploadData {
  name: string;
  data: string; // base64
  type: string; // MIME type;
}

export type BlobFile = File | FileUIPart;
export type BlobFileList = FileList | BlobFile[];

export interface UseBlobFilesResult {
  /**
   * Current files (FileList in onSubmit mode, FileUIPart[] in immediate mode after upload)
   */
  files: BlobFileList;
  /**
   * Set files to upload
   * - In immediate mode: automatically uploads files
   * - In onSubmit mode: stores files for later upload
   */
  setFiles: (files: BlobFileList) => void;
  /**
   * Clear all files
   */
  clearFiles: () => void;
  /**
   * Process files for submission
   * - In immediate mode: returns already uploaded files
   * - In onSubmit mode: uploads files and returns FileUIPart[]
   * - If blob is disabled: returns original files as-is
   */
  processFiles: () => Promise<BlobFileList>;
  /**
   * Whether files are currently being uploaded
   */
  isUploading: boolean;
  /**
   * Upload timing strategy
   */
  uploadTiming: "immediate" | "onSubmit";
}

/**
 * Hook to handle blob files validation and upload
 *
 * @example
 * ```tsx
 * const { files, setFiles, processFiles, clearFiles, isUploading } = useBlobFiles(client);
 *
 * // File selection (automatic upload in immediate mode)
 * const handleFileSelect = (selectedFiles: FileList) => {
 *   setFiles(Array.from(selectedFiles));
 * };
 *
 * // Submit
 * const handleSubmit = async () => {
 *   const uploadedFiles = await processFiles();
 *   // Send message with uploadedFiles
 *   clearFiles();
 * };
 * ```
 */
export function useBlobFiles(client: AgentStartAPI): UseBlobFilesResult {
  const orpc = createTanstackQueryUtils(client);

  // Fetch blob configuration
  const { data: config } = useQuery(
    orpc.blob.getConfig.queryOptions({
      input: {},
    }),
  );

  const isEnabled = Boolean(config?.enabled);
  const uploadTiming = config?.constraints?.uploadTiming ?? "onSubmit";

  // Internal state
  const [files, setFilesState] = useState<BlobFileList>([] as BlobFile[]);

  const inferFilename = useCallback((url?: string): string => {
    if (!url) {
      return "attachment";
    }
    try {
      const parsed = new URL(url);
      const candidate = parsed.pathname.split("/").pop();
      if (candidate) {
        return candidate;
      }
    } catch {
      const candidate = url.split("/").pop();
      if (candidate && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return "attachment";
  }, []);

  const shouldUpload = useCallback((file: BlobFile): boolean => {
    if (file instanceof File) {
      return true;
    }
    if (!isFileUIPart(file)) {
      return false;
    }
    return (
      typeof file.url === "string" &&
      (file.url.startsWith("blob:") || file.url.startsWith("data:"))
    );
  }, []);

  const convertFileUIPartToFile = useCallback(
    async (filePart: FileUIPart): Promise<File> => {
      const filename = filePart.filename ?? inferFilename(filePart.url);
      const response = await fetch(filePart.url);
      if (!response.ok) {
        throw new Error("Failed to resolve file from provided URL");
      }
      const blob = await response.blob();
      return new File([blob], filename, {
        type: filePart.mediaType || blob.type || "application/octet-stream",
      });
    },
    [inferFilename],
  );

  const prepareFilesForUpload = useCallback(
    async (input: BlobFile[]): Promise<File[]> => {
      if (input.length === 0) {
        return [];
      }
      const results = await Promise.all(
        input.map((item) =>
          item instanceof File
            ? Promise.resolve(item)
            : convertFileUIPartToFile(item),
        ),
      );
      return results;
    },
    [convertFileUIPartToFile],
  );

  const mergeUploadResults = useCallback(
    (original: BlobFile[], uploaded: FileUIPart[]): FileUIPart[] => {
      const expectedUploads = original.reduce(
        (count, item) => (shouldUpload(item) ? count + 1 : count),
        0,
      );

      if (expectedUploads === 0) {
        return original.filter(
          (item): item is FileUIPart => !(item instanceof File),
        );
      }

      if (uploaded.length < expectedUploads) {
        throw new Error("Upload response missing expected files");
      }

      let uploadIndex = 0;
      return original.map((item) => {
        if (shouldUpload(item)) {
          const replacement = uploaded[uploadIndex];
          if (!replacement) {
            throw new Error("Upload response missing expected file");
          }
          uploadIndex += 1;
          return replacement;
        }
        return item as FileUIPart;
      }) as FileUIPart[];
    },
    [shouldUpload],
  );

  /**
   * Validate a single file against constraints
   */
  const validateFile = useCallback(
    (file: File): ValidationError | null => {
      if (!config?.constraints) {
        return null;
      }

      const constraints = config.constraints;

      // Check file size
      if (constraints.maxFileSize && file.size > constraints.maxFileSize) {
        return {
          field: file.name,
          message: `File size ${file.size} exceeds maximum allowed size of ${constraints.maxFileSize} bytes`,
          constraint: "maxFileSize",
        };
      }

      // Check MIME type
      if (constraints.allowedMimeTypes?.length) {
        if (!constraints.allowedMimeTypes.includes(file.type)) {
          return {
            field: file.name,
            message: `File type ${file.type} is not allowed. Allowed types: ${constraints.allowedMimeTypes.join(", ")}`,
            constraint: "allowedMimeTypes",
          };
        }
      }

      return null;
    },
    [config],
  );

  /**
   * Validate multiple files against constraints
   */
  const validateFiles = useCallback(
    (files: File[]): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (!config?.constraints) {
        return errors;
      }

      const constraints = config.constraints;

      // Check file count
      if (constraints.maxFiles && files.length > constraints.maxFiles) {
        errors.push({
          field: "files",
          message: `Too many files. Maximum allowed: ${constraints.maxFiles}, received: ${files.length}`,
          constraint: "maxFiles",
        });
      }

      // Validate each file
      for (const file of files) {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        }
      }

      return errors;
    },
    [config, validateFile],
  );

  /**
   * Core upload function (shared by uploadFiles and processFiles)
   */
  const performUpload = useCallback(
    async (files: File[] | FileUIPart[]): Promise<FileUIPart[]> => {
      if (!isEnabled) {
        throw new Error("Blob storage is not enabled");
      }

      const fileList = Array.from(files as BlobFile[]);
      const uploadCandidates = fileList.filter((file) => shouldUpload(file));

      if (uploadCandidates.length === 0) {
        return [];
      }

      const normalizedFiles = await prepareFilesForUpload(uploadCandidates);

      // Validate files before upload
      const validationErrors = validateFiles(normalizedFiles);
      if (validationErrors.length > 0) {
        throw new Error(
          `File validation failed: ${validationErrors.map((e) => e.message).join(", ")}`,
        );
      }

      // Convert files to base64
      const filesData: FileUploadData[] = await Promise.all(
        normalizedFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return {
            name: file.name,
            data: base64,
            type: file.type,
          };
        }),
      );

      // Upload using ORPC
      const result = await client.blob.upload({
        files: filesData,
      });

      if (!result.success || !result.files) {
        throw new Error("Upload failed: Invalid response");
      }

      // Convert uploaded files to FileUIPart format
      return result.files.map(
        (file): FileUIPart => ({
          type: "file",
          filename: file.name,
          mediaType: file.contentType ?? "application/octet-stream",
          url: file.url,
        }),
      );
    },
    [client, isEnabled, prepareFilesForUpload, shouldUpload, validateFiles],
  );

  /**
   * Upload mutation for uploading files to blob storage
   */
  const uploadMutation = useMutation({
    mutationFn: performUpload,
  });

  /**
   * Auto-upload files in immediate mode
   */
  useEffect(() => {
    if (
      !isEnabled ||
      uploadTiming !== "immediate" ||
      uploadMutation.isPending
    ) {
      return;
    }

    const fileArray =
      files instanceof FileList ? Array.from(files) : (files as BlobFile[]);

    if (fileArray.length === 0) {
      return;
    }

    const uploadCandidates = fileArray.filter((file) => shouldUpload(file));

    if (uploadCandidates.length === 0) {
      return;
    }

    prepareFilesForUpload(uploadCandidates)
      .then((filesToUpload) => {
        if (filesToUpload.length === 0) {
          return;
        }
        return uploadMutation
          .mutateAsync(filesToUpload)
          .then((uploadedFiles) => {
            const merged = mergeUploadResults(fileArray, uploadedFiles);
            setFilesState(merged);
          });
      })
      .catch((error) => {
        console.error("[useBlobFiles] Auto-upload failed:", error);
      });
  }, [
    files,
    uploadTiming,
    isEnabled,
    uploadMutation.isPending,
    uploadMutation.mutateAsync,
    mergeUploadResults,
    prepareFilesForUpload,
    shouldUpload,
  ]);

  /**
   * Set files to upload
   */
  const setFiles = useCallback((newFiles: BlobFileList) => {
    setFilesState(newFiles);
  }, []);

  /**
   * Clear all files
   */
  const clearFiles = useCallback(() => {
    setFilesState([] as BlobFile[]);
  }, []);

  /**
   * Process files for submission
   */
  const processFiles = useCallback(async (): Promise<BlobFileList> => {
    const fileArray =
      files instanceof FileList ? Array.from(files) : (files as BlobFile[]);

    // If no files, return empty array
    if (fileArray.length === 0) {
      return [] as BlobFile[];
    }

    // If blob is disabled, return files as-is
    if (!isEnabled) {
      return files;
    }

    const uploadCandidates = fileArray.filter((file) => shouldUpload(file));

    if (uploadCandidates.length === 0) {
      return fileArray as BlobFile[];
    }

    const uploadableFiles = await prepareFilesForUpload(uploadCandidates);

    if (uploadableFiles.length === 0) {
      return fileArray as BlobFile[];
    }

    const uploadedFiles = await uploadMutation.mutateAsync(uploadableFiles);
    return mergeUploadResults(fileArray, uploadedFiles);
  }, [
    files,
    isEnabled,
    mergeUploadResults,
    prepareFilesForUpload,
    shouldUpload,
    uploadMutation,
  ]);

  return useMemo(
    () => ({
      files,
      setFiles,
      clearFiles,
      processFiles,
      isUploading: uploadMutation.isPending,
      uploadTiming,
    }),
    [
      files,
      setFiles,
      clearFiles,
      processFiles,
      uploadMutation.isPending,
      uploadTiming,
    ],
  );
}
