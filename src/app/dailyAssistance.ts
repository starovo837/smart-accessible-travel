import { copyDictionary } from "./copyDictionary.ts";
// Color and brightness routines adapted from Hello AI (MIT), fuwawas/hello-ai-accessibility.
// Camera exposure and white balance affect these estimates; they are not lux readings.
export function imageSummary(data: Uint8ClampedArray, width: number, height: number) {
    let luminance = 0, samples = 0, r = 0, g = 0, b = 0, centerSamples = 0;
    for (let y = 0; y < height; y += 4)
        for (let x = 0; x < width; x += 4) {
            const i = (y * width + x) * 4;
            luminance += data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114;
            samples++;
            if (Math.abs(x - width / 2) < width / 6 && Math.abs(y - height / 2) < height / 6) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                centerSamples++;
            }
        }
    const brightness = samples ? Math.round(luminance / samples) : 0;
    return { brightness, light: brightness > 200 ? copyDictionary.cac64c586e964b6ac : brightness > 150 ? copyDictionary.c9fcef2fba7cd2768 : brightness > 100 ? copyDictionary.cfe4e7b3d04416dba : brightness > 50 ? copyDictionary.cc40d9c9904578fd9 : copyDictionary.c10d86df425e51a64, color: colorName(r / Math.max(1, centerSamples), g / Math.max(1, centerSamples), b / Math.max(1, centerSamples)) };
}
export function colorName(r: number, g: number, b: number) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), diff = max - min;
    if (diff < 30)
        return max > 200 ? copyDictionary.cf56e7eff58bf730d : max > 150 ? copyDictionary.ce7f192b2d7e8fd40 : max > 80 ? copyDictionary.c051e67d913f4a72e : max > 30 ? copyDictionary.cff95d50303902053 : copyDictionary.ced7d2c54184be5f5;
    let hue = max === r ? ((g - b) / diff) % 6 : max === g ? (b - r) / diff + 2 : (r - g) / diff + 4;
    hue = (hue * 60 + 360) % 360;
    const prefix = (max + min) / 2 < 80 ? copyDictionary.cd5f3c536a75905fd : (max + min) / 2 > 200 ? copyDictionary.ce445205d07c371f2 : '';
    return prefix + (hue < 15 || hue >= 345 ? copyDictionary.c789f61dbfcc7a2d2 : hue < 45 ? copyDictionary.caa1e899dd35771b0 : hue < 70 ? copyDictionary.cd451c07d739b3306 : hue < 160 ? copyDictionary.c30c83dc25b12c32c : hue < 200 ? copyDictionary.cd76f2cfec9943354 : hue < 260 ? copyDictionary.c67035e6b7f82acdb : hue < 290 ? copyDictionary.c2ed9c6fabac2013a : copyDictionary.cdbd379b39f0d3537);
}
export const dailyTemplates = [
    { id: 'leave', title: copyDictionary.c7e232423e8fbf2ad, steps: [copyDictionary.c8f56162de08b205e, copyDictionary.c185cebd62979fc01, copyDictionary.cfcb89aed94ff3123] },
    { id: 'rest', title: copyDictionary.cadf092bb4f10af68, steps: [copyDictionary.c055b10687a13a0f9, copyDictionary.cd9135a5e3b106c2d, copyDictionary.c4584b615f20a6638] },
    { id: 'appointment', title: copyDictionary.c6b566740c2ec60fb, steps: [copyDictionary.c364bc7f2382ee2fb, copyDictionary.cb718380e31ca7775, copyDictionary.c08f08852f94d78f1] }
];
