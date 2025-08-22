import { MAX_THUMBNAIL_FILE_SIZE } from "@/contracts/novels";
import { getNovelImageStream, setNovelImage, validateImage } from "../images";

export function validateThumbnail(file: File | null | undefined): File {
  return validateImage(file, MAX_THUMBNAIL_FILE_SIZE);
}
export function setNovelThumbnail(novelId: string, imageFile: File) {
  return setNovelImage(novelId, imageFile, "thumbnail");
}
export function getNovelThumbnailStream(novelId: string, fileName: string) {
  return getNovelImageStream(novelId, "thumbnail", fileName);
}
