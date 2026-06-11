/** Validation côté client — alignée sur le backend (photos d'activités du jour). */

export const ACTIVITY_PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif"

export const ACTIVITY_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const ACTIVITY_PHOTO_MIN_BYTES = 12

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._ -]{1,200}$/

export type ActivityPhotoValidationErrorKey =
  | "invalidType"
  | "tooLarge"
  | "tooSmall"
  | "invalidName"

export function validateActivityPhotoFile(
  file: File,
): ActivityPhotoValidationErrorKey | null {
  const mime = (file.type ?? "").toLowerCase().trim()
  if (!ALLOWED_MIME.has(mime)) {
    return "invalidType"
  }
  if (file.size > ACTIVITY_PHOTO_MAX_BYTES) {
    return "tooLarge"
  }
  if (file.size < ACTIVITY_PHOTO_MIN_BYTES) {
    return "tooSmall"
  }
  const rawName = file.name.trim()
  if (rawName.includes("..") || /[\\/]/.test(rawName)) {
    return "invalidName"
  }
  const base = rawName.split(/[/\\]/).pop() ?? ""
  if (base && !SAFE_FILENAME_REGEX.test(base)) {
    return "invalidName"
  }
  return null
}

export function filterValidActivityPhotoFiles(files: File[]): {
  valid: File[]
  errors: ActivityPhotoValidationErrorKey[]
} {
  const valid: File[] = []
  const errors: ActivityPhotoValidationErrorKey[] = []
  for (const file of files) {
    const err = validateActivityPhotoFile(file)
    if (err) {
      errors.push(err)
    } else {
      valid.push(file)
    }
  }
  return { valid, errors }
}
