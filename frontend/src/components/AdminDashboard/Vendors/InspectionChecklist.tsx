"use client";

import { useState } from "react";
import { ClipboardCheck, CheckCircle, XCircle, Clock, ChevronDown } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { fieldLabelForKey as humanizeFieldKey } from "@/lib/inspectionFieldLabel";

type Verification = { ok: boolean | null; remarks: string };

// Maps a verification field key (e.g. "w_electricityAvailable") to the 9-step
// section it belongs to.
const VERIFICATION_SECTIONS: { label: string; test: (k: string) => boolean }[] = [
  { label: "Step 1 · Company Info", test: (k) => k.startsWith("c_") },
  { label: "Step 2 · Warehouse & Factory", test: (k) => k.startsWith("w_") },
  { label: "Step 3 · Owner Profile", test: (k) => k.startsWith("o_") },
  { label: "Step 4 · Vendor & Products", test: (k) => k.startsWith("vt_") },
  { label: "Step 5 · Manufacturing", test: (k) => k.startsWith("mf_") },
  { label: "Step 6 · Certifications", test: (k) => k.startsWith("cert_") || k.startsWith("certDoc_") },
  { label: "Step 7 · Contact & Trade", test: (k) => k.startsWith("ct_") },
];

function statusBadge(ok: boolean | null) {
  if (ok === true) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>;
  if (ok === false) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><XCircle className="w-3.5 h-3.5" /> Issue</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock className="w-3.5 h-3.5" /> Pending</span>;
}

export default function InspectionChecklist({ verifications }: { verifications: Record<string, Verification> }) {
  const allEntries = Object.entries(verifications || {});

  const groups = VERIFICATION_SECTIONS
    .map((sec) => ({ label: sec.label, items: allEntries.filter(([k]) => sec.test(k)) }))
    .filter((g) => g.items.length > 0);
  const matched = new Set(groups.flatMap((g) => g.items.map(([k]) => k)));
  const other = allEntries.filter(([k]) => !matched.has(k));
  if (other.length > 0) groups.push({ label: "Other", items: other });

  // Accordion: only one section open at a time. `undefined` = untouched (first
  // section starts open); `null` = user collapsed everything.
  const [openSection, setOpenSection] = useState<string | null | undefined>(undefined);
  const effectiveOpen = openSection === undefined ? groups[0]?.label : openSection;

  if (groups.length === 0) return null;

  return (
    <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-blue-600" /> Full Inspection Checklist ({allEntries.length})
        </h3>
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = effectiveOpen === group.label;
            return (
              <div key={group.label} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : group.label)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {group.label} ({group.items.length})
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="divide-y divide-slate-100">
                    {group.items.map(([key, val]) => (
                      <div key={key} className="flex items-start justify-between gap-4 px-4 py-2.5 bg-white">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{humanizeFieldKey(key)}</p>
                          {val.ok === false && val.remarks && <p className="text-xs text-red-600 mt-0.5">{val.remarks}</p>}
                        </div>
                        <div className="shrink-0">{statusBadge(val.ok)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
