// Single source of truth for turning a verification field key (e.g.
// "mf_spinning_spinningMachines") into a readable label. Used by the PDF report
// AND every on-screen inspection view so the "Issues Found" / checklist field
// names always match. The verification map stores only { ok, remarks } per key
// (not the form label), so the label is reconstructed from the key:
//   1. strip the step prefix (c_/w_/o_/vt_/mf_/ct_/cert_/certDoc_)
//   2. split underscores and camelCase into words
//   3. expand common abbreviations (wh → Warehouse, sku → SKU, …)
//   4. bump 0-based indices to 1-based (Product 0 → Product 1)
//   5. drop adjacent duplicate words (Spinning Spinning Machines → Spinning Machines)
export function fieldLabelForKey(key: string): string {
  const rest = key.replace(/^(certDoc_|cert_|vt_|mf_|ct_|c_|w_|o_)/, "");
  const spaced = rest.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const WORD: Record<string, string> = {
    wh: "Warehouse", legal: "Legal", prod: "Product", img: "Image",
    cat: "Category", photo: "Photo", spec: "Spec", var: "Variant",
    std: "Standard", dims: "Dimensions", sku: "SKU", uom: "UOM",
    gst: "GST", id: "ID", qc: "QC",
  };
  const words = spaced.split(/\s+/).filter(Boolean).map((w) => {
    const lower = w.toLowerCase();
    if (WORD[lower]) return WORD[lower];
    if (/^\d+$/.test(w)) return String(Number(w) + 1);
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const deduped = words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase());
  return deduped.join(" ") || key;
}
