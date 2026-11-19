import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
} from "firebase/storage";
import { storage } from "./config";

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_UPLOAD_BYTES = 10 * 1024 * 1024;

export type UserMediaFolder = "avatars" | "journals" | "feedback";
export type CommunityMediaFolder = "posts" | "comments" | "voice";

function sanitizeExtension(mimeType: string, fallbackName = ""): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes("webp")) return "webp";
  if (lower.includes("png")) return "png";
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  if (lower.includes("gif")) return "gif";
  if (lower.includes("webm")) return "webm";
  if (lower.includes("mp4") || lower.includes("m4a")) return "m4a";
  if (lower.includes("mpeg") || lower.includes("mp3")) return "mp3";
  if (lower.includes("ogg")) return "ogg";
  if (lower.includes("wav")) return "wav";
  const extFromName = fallbackName.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return extFromName || "bin";
}

function generateMediaId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Compresses an image file or data/blob URL client-side to WebP/JPEG before Storage upload.
 */
export async function compressImageBlob(
  input: Blob | File,
  maxDimension = 1280,
  quality = 0.84,
): Promise<{ blob: Blob; contentType: string }> {
  if (!input.type.startsWith("image/")) {
    throw new Error("Only image files are supported.");
  }
  if (input.size > MAX_IMAGE_UPLOAD_BYTES * 2) {
    throw new Error("Image file is too large. Please choose an image under 10 MB.");
  }

  if (typeof document === "undefined") {
    if (input.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error("Image file exceeds the 5 MB upload limit.");
    }
    return { blob: input, contentType: input.type || "image/jpeg" };
  }

  const objectUrl = URL.createObjectURL(input);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Unable to read image file."));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
    const width = Math.max(1, Math.round((img.width || maxDimension) * scale));
    const height = Math.max(1, Math.round((img.height || maxDimension) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      if (input.size > MAX_IMAGE_UPLOAD_BYTES) {
        throw new Error("Image file exceeds the 5 MB upload limit.");
      }
      return { blob: input, contentType: input.type || "image/jpeg" };
    }

    ctx.drawImage(img, 0, 0, width, height);

    const outputType = input.type === "image/png" ? "image/png" : "image/webp";
    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image compression failed."))),
        outputType,
        quality,
      );
    });

    const finalBlob =
      compressedBlob.size > MAX_IMAGE_UPLOAD_BYTES
        ? await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("Image compression failed."))),
              "image/jpeg",
              0.76,
            );
          })
        : compressedBlob;

    if (finalBlob.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error("Image exceeds 5 MB even after compression.");
    }

    return {
      blob: finalBlob,
      contentType: finalBlob.type || outputType,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function validateUploadPayload(blob: Blob): string {
  const mime = (blob.type || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isAudio = mime.startsWith("audio/");
  if (!isImage && !isAudio) {
    throw new Error("Unsupported media type. Only image and audio files can be uploaded.");
  }
  if (isImage && blob.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Images must be 5 MB or smaller.");
  }
  if (isAudio && blob.size > MAX_AUDIO_UPLOAD_BYTES) {
    throw new Error("Audio recordings must be 10 MB or smaller.");
  }
  return mime;
}

/**
 * Uploads private user media to `users/{uid}/{folder}/{id}.{ext}` and returns the HTTPS download URL.
 */
export async function uploadUserMedia(
  uid: string,
  folder: UserMediaFolder,
  input: Blob | File,
  options?: { maxDimension?: number },
): Promise<{ url: string; path: string; contentType: string }> {
  const cleanUid = uid.trim();
  if (!cleanUid) {
    throw new Error("Authentication required before uploading media.");
  }

  let uploadBlob: Blob = input;
  let contentType = input.type || "application/octet-stream";

  if (contentType.startsWith("image/")) {
    const compressed = await compressImageBlob(input, options?.maxDimension ?? (folder === "avatars" ? 512 : 1280));
    uploadBlob = compressed.blob;
    contentType = compressed.contentType;
  }

  validateUploadPayload(uploadBlob);
  const ext = sanitizeExtension(contentType, input instanceof File ? input.name : "");
  const storagePath = `users/${cleanUid}/${folder}/${generateMediaId()}.${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, uploadBlob, {
    contentType,
    cacheControl: "public, max-age=31536000",
  });

  const url = await getDownloadURL(storageRef);
  return { url, path: storagePath, contentType };
}

/**
 * Uploads authenticated community media (post images, comment voice notes, supportive globe audio)
 * to `communityMedia/{uid}/{folder}/{id}.{ext}` and returns the HTTPS download URL.
 */
export async function uploadCommunityMedia(
  uid: string,
  folder: CommunityMediaFolder,
  input: Blob | File,
): Promise<{ url: string; path: string; contentType: string }> {
  const cleanUid = uid.trim();
  if (!cleanUid) {
    throw new Error("Authentication required before uploading community media.");
  }

  let uploadBlob: Blob = input;
  let contentType = input.type || "application/octet-stream";

  if (contentType.startsWith("image/")) {
    const compressed = await compressImageBlob(input, 1280);
    uploadBlob = compressed.blob;
    contentType = compressed.contentType;
  }

  validateUploadPayload(uploadBlob);
  const ext = sanitizeExtension(contentType, input instanceof File ? input.name : "");
  const storagePath = `communityMedia/${cleanUid}/${folder}/${generateMediaId()}.${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, uploadBlob, {
    contentType,
    cacheControl: "public, max-age=31536000",
  });

  const url = await getDownloadURL(storageRef);
  return { url, path: storagePath, contentType };
}

async function deletePrefixRecursive(prefixPath: string): Promise<void> {
  const folderRef = ref(storage, prefixPath);
  const listing = await listAll(folderRef).catch(() => null);
  if (!listing) return;

  await Promise.all([
    ...listing.items.map((itemRef) => deleteObject(itemRef).catch(() => {})),
    ...listing.prefixes.map((subRef) => deletePrefixRecursive(subRef.fullPath)),
  ]);
}

/**
 * Deletes all stored media owned by a user during account deletion.
 */
export async function deleteUserStorageFolder(uid: string): Promise<void> {
  const cleanUid = uid.trim();
  if (!cleanUid) return;
  await Promise.all([
    deletePrefixRecursive(`users/${cleanUid}`),
    deletePrefixRecursive(`communityMedia/${cleanUid}`),
  ]);
}
