export type MediaPurpose =
  | 'USER_AVATAR'
  | 'BARBERSHOP_LOGO'
  | 'BARBERSHOP_COVER'
  | 'BARBERSHOP_GALLERY';

export interface InitiateUploadRequestDto {
  purpose: MediaPurpose;
  fileName: string;
  contentType: string;
  fileSize: number;
  barbershopId?: string;
}

export interface InitiateUploadResponseDto {
  mediaId: string;
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
}

export interface ConfirmUploadResponseDto {
  media: {
    id: string;
    purpose: MediaPurpose;
    status: 'PENDING' | 'READY' | 'REJECTED';
    publicUrl: string;
    width?: number;
    height?: number;
    mimeType: string;
    fileSize: number;
  };
}

export interface GalleryItemDto {
  id: string;
  barbershopId: string;
  mediaId: string;
  displayOrder: number;
  isCover: boolean;
  publicUrl?: string;
  createdAt?: string | Date;
}

export const MEDIA_LIMITS = {
  MAX_AVATAR_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_SPACE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_GALLERY_PHOTO_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB (alias for space photo)
  MAX_GALLERY_PHOTOS: 10,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp'],
};
