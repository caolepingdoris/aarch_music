/** Material reading → low-pass cutoff (Hz) for the lead voice. */
export function materialFilterFreq(materials: string[] = []): number {
  const m = (materials || []).join(" ").toLowerCase();
  if (/glass/.test(m)) return 9000;
  if (/steel|iron|metal|cable/.test(m)) return 6000;
  if (/wood|timber/.test(m)) return 2600;
  if (/stone|concrete|brick|masonry|marble/.test(m)) return 1300;
  return 3500;
}

export function materialTextureLabel(materials: string[] = []): string {
  const m = (materials || []).join(" ").toLowerCase();
  if (/glass/.test(m)) return "glass brightens the tone into a shimmering upper register";
  if (/steel|iron|metal|cable/.test(m)) return "steel/metal keeps the tone bright and resonant";
  if (/wood|timber/.test(m)) return "wood warms the tone toward a rounder midrange";
  if (/stone|concrete|brick|masonry|marble/.test(m)) return "stone/concrete mutes the tone into a darker register";
  return "an unremarkable material reading keeps the tone neutral";
}
