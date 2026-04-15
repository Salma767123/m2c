// Shared form-field helpers for the inspection step components.
// Keeps styling and error/required UI consistent across all steps.

export const BASE_INPUT =
    "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-colors"
export const OK_BORDER = "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
export const ERR_BORDER =
    "border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/30"

export function inputCls(hasError: boolean, extra = "") {
    return `${BASE_INPUT} ${hasError ? ERR_BORDER : OK_BORDER} ${extra}`.trim()
}

export function ErrorText({ msg }: { msg?: string }) {
    if (!msg) return null
    return <p className="mt-2 text-xs text-red-600 font-medium">{msg}</p>
}

export function RequiredMark() {
    return <span className="text-red-500 ml-0.5" aria-label="required">*</span>
}

// Styling for vendor-autofilled, checker-immutable fields.
export const READONLY_CLS = `${BASE_INPUT} ${OK_BORDER} bg-slate-100 cursor-not-allowed`
