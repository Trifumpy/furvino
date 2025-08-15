export function trimZeros(num: number | string): string {
  return num.toString().replace(/\.?0+$/, "");
}
