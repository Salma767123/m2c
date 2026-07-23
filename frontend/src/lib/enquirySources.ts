/**
 * "How did you hear about us?" options for the website contact enquiry form.
 *
 * Values are stable slugs (never change them once live) so enquiries can be
 * grouped and counted in reports; labels are display-only and safe to reword.
 * Shared by the storefront form, the admin enquiry views and the source report
 * so all three always agree on the same set.
 */
export interface HearAboutUsOption {
    value: string
    label: string
}

export const HEAR_ABOUT_US_OPTIONS: HearAboutUsOption[] = [
    { value: 'search_engine', label: 'Google / Search Engine' },
    { value: 'social_media', label: 'Social Media (Instagram, Facebook…)' },
    { value: 'referral', label: 'Friend or Family Referral' },
    { value: 'existing_customer', label: 'Existing Customer' },
    { value: 'advertisement', label: 'Advertisement' },
    { value: 'trade_show', label: 'Trade Show / Exhibition' },
    { value: 'email_newsletter', label: 'Email / Newsletter' },
    { value: 'other', label: 'Other' },
]

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
    HEAR_ABOUT_US_OPTIONS.map((o) => [o.value, o.label]),
)

/**
 * Display label for a stored slug. Falls back to the raw value so legacy or
 * unrecognised entries still render something meaningful, and to an em dash
 * when the enquiry predates this field.
 */
export function getHearAboutUsLabel(value?: string | null): string {
    if (!value) return '—'
    return LABEL_BY_VALUE[value] || value
}
