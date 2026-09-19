// Pixel size of a JPEG, PNG or GIF, read from the first bytes of the file.
// The feeds store it so the dashboard can frame a picture to its own shape
// instead of letterboxing it inside a fixed 16:9 box.
export interface PixelSize {
  width: number;
  height: number;
}

export function sizeFromBytes(bytes: Uint8Array): PixelSize | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = (width: number, height: number) => (width > 0 && height > 0 ? { width, height } : null);

  // PNG: signature, then IHDR with width and height as big-endian u32.
  if (bytes.length >= 24 && v.getUint32(0) === 0x89504e47) return size(v.getUint32(16), v.getUint32(20));
  // GIF ("GIF8"): logical screen size as little-endian u16.
  if (bytes.length >= 10 && v.getUint32(0) === 0x47494638) return size(v.getUint16(6, true), v.getUint16(8, true));
  // JPEG: walk the segments to the first start-of-frame. Segments are skipped by their
  // length, so a thumbnail embedded in the EXIF block is never mistaken for the picture.
  if (bytes.length >= 4 && v.getUint16(0) === 0xffd8) {
    let i = 2;
    while (i + 9 <= bytes.length) {
      if (bytes[i] !== 0xff) return null;
      const marker = bytes[i + 1];
      if (marker === 0xff) { i += 1; continue; } // fill byte
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += 2; continue; } // no payload
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return size(v.getUint16(i + 7), v.getUint16(i + 5));
      i += 2 + v.getUint16(i + 2);
    }
  }
  return null;
}
