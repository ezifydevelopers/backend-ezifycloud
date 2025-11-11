export interface CreateItemFileInput {
  itemId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface ItemFileQueryFilters {
  itemId?: string;
  uploadedBy?: string;
  folder?: string | null; // null for root folder, undefined to include all
  includeVersions?: boolean; // If true, include all versions; if false, only latest
}

export interface ItemFileWithUploader {
  id: string;
  itemId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
}

