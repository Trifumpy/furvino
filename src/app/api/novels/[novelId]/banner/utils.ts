import { MAX_BANNER_FILE_SIZE } from "@/contracts/novels";
import { getNovelImageStream, setNovelImage, validateImage } from "../images";

export function validateBanner(file: File | null | undefined): File {
  return validateImage(file, MAX_BANNER_FILE_SIZE);
}
export function setNovelBanner(novelId: string, imageFile: File) {
  return setNovelImage(novelId, imageFile, "banner");
}
export function getNovelBannerStream(novelId: string, fileName: string) {
  return getNovelImageStream(novelId, "banner", fileName);
}
