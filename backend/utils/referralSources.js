/**
 * Vendor acquisition channels — "How did you hear about us?" on the last step of
 * vendor registration.
 *
 * Single source of truth for the option ids so the registration controller, the
 * reports groupBy and any future consumer agree. The frontend keeps a matching
 * label map (see ContactTradeInfo.tsx / VendorView.tsx); ids are what's stored.
 *
 * Stored as a plain String column rather than a Prisma enum: the list is
 * product-driven, an 'others' answer carries free text alongside it, and MongoDB
 * enums offer no cheap migration for the legacy rows that pre-date the field.
 */
const REFERRAL_SOURCE_OPTIONS = [
    { id: 'google', label: 'Google / Search' },
    { id: 'online-ads', label: 'Online Ads' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'referral', label: 'Referral / Word of Mouth' },
    { id: 'trade-show', label: 'Trade Show / Exhibition' },
    { id: 'others', label: 'Others' },
];

const REFERRAL_SOURCES = new Set(REFERRAL_SOURCE_OPTIONS.map((o) => o.id));

const REFERRAL_SOURCE_LABELS = REFERRAL_SOURCE_OPTIONS.reduce((acc, o) => {
    acc[o.id] = o.label;
    return acc;
}, {});

module.exports = { REFERRAL_SOURCE_OPTIONS, REFERRAL_SOURCES, REFERRAL_SOURCE_LABELS };
