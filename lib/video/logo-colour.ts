// The user's logo, made ready for the film (in the browser): drawn once to a PNG of a known size — so an SVG without
// a size, or any format the video's renderer can't draw directly, still shows — and its brand colour read from it:
// the average of its coloured pixels as #rrggbb, null for a logo with no colour (grey, black or white).
export type PreparedLogo = { url: string; colour: string | null };

const SIZE = 512;

export async function prepareLogo(url: string): Promise<PreparedLogo> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  try {
    await img.decode();
  } catch {
    throw new Error("Your logo could not be read. Upload it again as a PNG, JPG or SVG.");
  }
  const nw = img.naturalWidth || SIZE, nh = img.naturalHeight || SIZE;
  const scale = SIZE / Math.max(nw, nh);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(nw * scale));
  canvas.height = Math.max(1, Math.round(nh * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser can't read your logo.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0, g = 0, b = 0, weight = 0, seen = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    seen++;
    const max = Math.max(px[i], px[i + 1], px[i + 2]), min = Math.min(px[i], px[i + 1], px[i + 2]);
    const light = (max + min) / 510;
    const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    if (sat < 0.25 || light < 0.1 || light > 0.92) continue;
    r += px[i] * sat; g += px[i + 1] * sat; b += px[i + 2] * sat; weight += sat;
  }
  const hex = (x: number) => Math.round(x / weight).toString(16).padStart(2, "0");
  const colour = seen && weight >= seen * 0.04 ? `#${hex(r)}${hex(g)}${hex(b)}` : null;
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
  if (!blob) throw new Error("This browser can't read your logo.");
  return { url: URL.createObjectURL(blob), colour };
}
