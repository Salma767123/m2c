'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Lock, X, Save, Eye } from 'lucide-react';
import { emailTemplateService, EmailTemplate } from '@/services/emailTemplateService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

// Order + friendly labels for the category sections. Unknown categories fall
// through and render after these, using their raw name.
const CATEGORY_ORDER = ['ACCOUNT', 'NOTIFICATIONS', 'SECURITY'];
const CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT: 'Account',
  NOTIFICATIONS: 'Notifications',
  SECURITY: 'Security',
};

// Sample values used only for the live preview, so admins see something
// realistic instead of raw {{placeholders}}.
const SAMPLE_VALUES: Record<string, string> = {
  name: 'John Doe',
  userName: 'John Doe',
  companyName: 'Acme Textiles Pvt Ltd',
  brandName: 'M2C MarkDowns',
  email: 'john@acme.com',
  password: 'Temp@1234',
  checkerId: 'QC-00042',
  productName: 'Cotton Slub Shirt',
  vendorName: 'Acme Textiles',
  checkerName: 'Priya Sharma',
  loginLink: 'https://app.m2c.com/login',
  registrationLink: 'https://app.m2c.com/register?token=abc',
  verificationLink: 'https://app.m2c.com/verify-email?token=abc',
  verificationUrl: 'https://app.m2c.com/verify-email?token=abc',
  resetUrl: 'https://app.m2c.com/reset-password?token=abc',
  accountType: 'Vendor Account',
  scheduledDate: '5 Aug 2026',
  scheduledTime: '10:30 AM',
  // Vendor / credential emails
  ownerName: 'Jane Cooper',
  loginUrl: 'https://app.m2c.com/vendor',
  vendorEmail: 'jane@acme.com',
  reason: 'Submitted documents could not be verified.',
  phoneDisplay: '+91 90000 00000',
  locationDisplay: 'Bengaluru, Karnataka',
  reviewUrl: 'https://app.m2c.com/admin/dashboard/vendors',
  greetingName: 'Jane Cooper',
  // Inspection reminder
  checkerGreeting: 'Priya Sharma',
  vendorNameStrong: 'Acme Textiles',
  vendorNameOrDash: 'Acme Textiles',
  scheduledDateOrDash: '5 Aug 2026',
  scheduledTimeOrDash: '10:30 AM',
  vendorNameSubject: 'Acme Textiles',
  // Low-stock alert
  skuDisplay: 'SKU-1042',
  categoryDisplay: 'Terry Towels',
  currentStock: '3',
  minStock: '10',
  dashboardUrl: 'https://app.m2c.com/vendor/dashboard/inventory',
  // Pre-computed HTML blocks (rendered as-is in the preview)
  vendorNameBlock: ' for <strong>Acme Textiles</strong>',
  checkerLineBlock: 'Quality checker <strong>Priya Sharma</strong> is',
  estimatedDurationAndLocationBlock:
    '<p style="margin:0 0 14px;color:#111827;font-size:15px;font-weight:600;">2 hours</p><p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Location</p><p style="margin:0;color:#111827;font-size:15px;font-weight:600;">Bengaluru, Karnataka</p>',
  unitsSection:
    '<p style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:600;">Units at or below their alert level:</p>',
};

function previewValue(varName: string): string {
  return SAMPLE_VALUES[varName] ?? `[${varName}]`;
}

function interpolatePreview(str: string): string {
  return (str || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => previewValue(key));
}

interface EditForm {
  subject: string;
  fromName: string;
  emoji: string;
  headerTitle: string;
  headerSubtitle: string;
  bodyText: string;
  buttonLabel: string;
  footerText: string;
}

interface Props {
  isReadOnly?: boolean;
}

export default function EmailTemplatesTab({ isReadOnly = false }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Editing state
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<EditForm>({
    subject: '', fromName: '', emoji: '', headerTitle: '', headerSubtitle: '',
    bodyText: '', buttonLabel: '', footerText: '',
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  // Composed (uninterpolated) HTML from the backend; sample values filled at render.
  const [previewHtml, setPreviewHtml] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await emailTemplateService.getTemplates();
      if (res.success) setTemplates(res.data);
    } catch (e: any) {
      showErrorToast('Failed to load email templates', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Group templates by category, honouring CATEGORY_ORDER first.
  const grouped = useMemo(() => {
    const byCat = new Map<string, EmailTemplate[]>();
    for (const t of templates) {
      if (!byCat.has(t.category)) byCat.set(t.category, []);
      byCat.get(t.category)!.push(t);
    }
    const cats = Array.from(byCat.keys()).sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return cats.map((c) => ({ category: c, items: byCat.get(c)! }));
  }, [templates]);

  const handleToggle = async (t: EmailTemplate) => {
    if (isReadOnly || t.isSecurity) return;
    const next = !t.enabled;
    setTogglingId(t.id);
    setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: next } : x)));
    try {
      const res = await emailTemplateService.toggleTemplate(t.id, next);
      showSuccessToast(res.message || 'Updated');
    } catch (e: any) {
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: !next } : x)));
      showErrorToast('Update failed', e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const openEditor = (t: EmailTemplate) => {
    setEditing(t);
    setForm({
      subject: t.subject,
      fromName: t.fromName || '',
      emoji: t.emoji || '',
      headerTitle: t.headerTitle || '',
      headerSubtitle: t.headerSubtitle || '',
      bodyText: t.bodyText || '',
      buttonLabel: t.buttonLabel || '',
      footerText: t.footerText || '',
    });
    setPreviewHtml(t.bodyHtml); // instant preview; refined by the API below
    setShowPreview(true);
  };

  const closeEditor = () => {
    setEditing(null);
    setSaving(false);
    setPreviewHtml('');
  };

  // Debounced live preview — recompose via backend whenever the draft changes.
  useEffect(() => {
    if (!editing) return;
    const id = editing.id;
    const handle = setTimeout(async () => {
      try {
        const res = await emailTemplateService.previewTemplate(id, {
          emoji: form.emoji || null,
          headerTitle: form.headerTitle,
          headerSubtitle: form.headerSubtitle,
          bodyText: form.bodyText,
          buttonLabel: form.buttonLabel || null,
          footerText: form.footerText,
        });
        if (res.success) setPreviewHtml(res.data.html);
      } catch {
        /* keep last good preview */
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, form.emoji, form.headerTitle, form.headerSubtitle, form.bodyText, form.buttonLabel, form.footerText]);

  const insertVariable = (varName: string) => {
    const token = `{{${varName}}}`;
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, bodyText: f.bodyText + token }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = form.bodyText.slice(0, start) + token + form.bodyText.slice(end);
    setForm((f) => ({ ...f, bodyText: next }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!form.subject.trim()) return showErrorToast('Subject cannot be empty');
    if (!form.headerTitle.trim()) return showErrorToast('Header title cannot be empty');
    if (!form.bodyText.trim()) return showErrorToast('Message cannot be empty');
    try {
      setSaving(true);
      const res = await emailTemplateService.updateTemplate(editing.id, {
        subject: form.subject,
        fromName: form.fromName.trim() || null,
        emoji: form.emoji || null,
        headerTitle: form.headerTitle,
        headerSubtitle: form.headerSubtitle,
        bodyText: form.bodyText,
        buttonLabel: form.buttonLabel || null,
        footerText: form.footerText,
      });
      setTemplates((prev) => prev.map((x) => (x.id === editing.id ? res.data : x)));
      showSuccessToast('Saved', `"${res.data.name}" updated`);
      closeEditor();
    } catch (e: any) {
      showErrorToast('Save failed', e.message);
      setSaving(false);
    }
  };

  const field =
    'w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent disabled:bg-slate-100';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <div>
      {/* Templates list — full width */}
      <div className="min-w-0">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading templates…</div>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No email templates found. Run the seed script to populate them.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {grouped.map(({ category, items }) => (
              <div key={category}>
                <div className="px-6 pt-5 pb-2">
                  <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                </div>
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                      <p className="text-sm text-slate-500 truncate">{t.description}</p>
                    </div>

                    {t.isSecurity ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"
                        title="Security emails always send"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Always on
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={t.enabled}
                        disabled={isReadOnly || togglingId === t.id}
                        onClick={() => handleToggle(t)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                          t.enabled ? 'bg-brand-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            t.enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditor(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editing.name}</h3>
                <p className="text-xs text-slate-500">{CATEGORY_LABELS[editing.category] || editing.category}</p>
              </div>
              <button onClick={closeEditor} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: form on the left, live preview on the right */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex items-center justify-end mb-3">
                <button
                  type="button"
                  onClick={() => setShowPreview((p) => !p)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showPreview ? 'Hide preview' : 'Show preview'}
                </button>
              </div>

              <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* ── Left: editable fields ── */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Subject</label>
                      <input type="text" value={form.subject} disabled={isReadOnly}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })} className={field} />
                    </div>
                    <div>
                      <label className={labelCls}>From name <span className="text-slate-400 font-normal">(sender label)</span></label>
                      <input type="text" value={form.fromName} disabled={isReadOnly} placeholder="M2C MarkDowns"
                        onChange={(e) => setForm({ ...form, fromName: e.target.value })} className={field} />
                    </div>
                  </div>

                  <div className="grid grid-cols-[80px_1fr] gap-4">
                    <div>
                      <label className={labelCls}>Icon</label>
                      <input type="text" value={form.emoji} disabled={isReadOnly} maxLength={4}
                        onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                        className={`${field} text-center text-lg`} />
                    </div>
                    <div>
                      <label className={labelCls}>Header title</label>
                      <input type="text" value={form.headerTitle} disabled={isReadOnly}
                        onChange={(e) => setForm({ ...form, headerTitle: e.target.value })} className={field} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Header subtitle</label>
                    <input type="text" value={form.headerSubtitle} disabled={isReadOnly}
                      onChange={(e) => setForm({ ...form, headerSubtitle: e.target.value })} className={field} />
                  </div>

                  {/* Variable chips */}
                  {editing.variables.length > 0 && (
                    <div>
                      <label className={labelCls}>
                        Insert variable <span className="text-slate-400 font-normal">(click to add into the message)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {editing.variables.map((v) => (
                          <button key={v} type="button" disabled={isReadOnly} onClick={() => insertVariable(v)}
                            className="px-2 py-1 text-xs font-mono rounded-md bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors disabled:opacity-60">
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Message</label>
                    <textarea ref={bodyRef} value={form.bodyText} disabled={isReadOnly}
                      onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
                      rows={9}
                      placeholder="Write the email message. Leave a blank line between paragraphs."
                      className={`${field} leading-relaxed resize-y`} />
                    <p className="mt-1.5 text-xs text-slate-400">
                      Plain text — leave a blank line between paragraphs. Details tables, buttons and the footer are added automatically.
                    </p>
                  </div>

                  {editing.hasButton && (
                    <div>
                      <label className={labelCls}>Button label</label>
                      <input type="text" value={form.buttonLabel} disabled={isReadOnly} placeholder="e.g. Log in"
                        onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} className={field} />
                      <p className="mt-1.5 text-xs text-slate-400">Leave blank to hide the button. Its link is set automatically.</p>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Footer text</label>
                    <input type="text" value={form.footerText} disabled={isReadOnly}
                      onChange={(e) => setForm({ ...form, footerText: e.target.value })} className={field} />
                  </div>
                </div>

                {/* ── Right: live preview ── */}
                {showPreview && (
                  <div className="lg:sticky lg:top-0 self-start w-full">
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-500 truncate">
                        Preview — <span className="font-medium">{interpolatePreview(form.subject)}</span>
                      </div>
                      <iframe
                        title="Email preview"
                        className="w-full h-[520px] bg-white"
                        sandbox=""
                        srcDoc={interpolatePreview(previewHtml)}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      Preview uses sample data. Variables like <code className="font-mono">{'{{name}}'}</code> are filled in when the email is sent.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={closeEditor}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              {!isReadOnly && (
                <button onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
