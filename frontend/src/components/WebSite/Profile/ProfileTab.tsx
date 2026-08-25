"use client";

import { Mail, Phone, MessageCircle, MapPin, SquarePen, Save, X } from "lucide-react";
import Dropdown from "@/components/UI/Dropdown";
import CountryCodeSelect from "@/components/UI/CountryCodeSelect";
import type { UserProfile } from "./types";

interface ProfileTabProps {
  editedProfile: UserProfile;
  setEditedProfile: (profile: UserProfile) => void;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  /** Switches the account page to the Saved Addresses tab. */
  onGoToAddresses: () => void;
}

/**
 * Profile Information.
 *
 * A merge of two lines of work. The fields, the country-code phone controls
 * and the Title / Middle name additions come from main and are unchanged in
 * behaviour — they are backed by real User columns. Everything else here is
 * presentation:
 *
 *  1. The dashed box is gone. A dashed border means "drop something here" or
 *     "not finished yet" — it is an upload affordance. Wrapped around a form
 *     section it made a finished page look unbuilt, and it put a second frame
 *     inside a card that was already a frame. A small label and a rule
 *     announce the section instead, the way the rest of the site does it.
 *
 *  2. Edit, Save and Cancel moved here from the sidebar. They belong beside
 *     the fields they unlock — and in the sidebar they showed on the Orders
 *     and Support tabs too, where pressing Edit put the form into an edit mode
 *     the reader could not see.
 *
 *  3. Warm palette. This page was slate grey with a blue notice; the
 *     storefront is linen, cream and oxblood. Side by side they did not read
 *     as the same product.
 */

const TITLE_OPTIONS = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Miss", label: "Miss" },
  { value: "Dr", label: "Dr" },
  { value: "Mx", label: "Mx" },
];

export default function ProfileTab({
  editedProfile,
  setEditedProfile,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onGoToAddresses,
}: ProfileTabProps) {
  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile({
      ...editedProfile,
      [field]: value,
    });
  };

  // One definition for every input, so a locked field looks the same wherever
  // it appears. #5f5550 on the disabled ground measures 6.1:1 — the greyed-out
  // text still has to be readable, since for most visits this form is only
  // ever read.
  const fieldClass =
    "w-full rounded-xl border border-[#e6dcd0] bg-white px-4 py-3 text-[15px] text-[#1a1a1a] transition-colors duration-200 placeholder:text-[#a89a8d] focus:border-[#e01a1b] focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/25 disabled:cursor-not-allowed disabled:border-[#eee6dc] disabled:bg-[#faf7f3] disabled:text-[#5f5550]";

  const labelClass =
    "mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#5f5550]";

  /**
   * Dropdown and CountryCodeSelect both paint their own disabled state in
   * slate — bg-gray-100 and bg-slate-50 with grey borders — while every input
   * beside them locks to warm cream. Side by side they read as controls
   * borrowed from another app.
   *
   * Overridden here rather than in those components. Dropdown alone has 67
   * call sites across admin, vendor and checker; changing its defaults to suit
   * one customer form would repaint all of them.
   *
   * The `!` suffixes are load-bearing. Their colours are plain utilities in
   * the same layer as these, so class order in the attribute decides nothing —
   * without important, which one wins depends on the order Tailwind happens to
   * emit them in.
   *
   * `[&>span]` reaches Dropdown's inner label span, which carries its own
   * text-gray-900 and would otherwise stay near-black while every other locked
   * field faded to #5f5550.
   */
  const dropdownButtonClass = [
    "rounded-xl! py-3! text-[15px]!",
    "border-[#e6dcd0]! bg-white!",
    isEditing
      ? "hover:border-[#c9bcae]! [&>span]:text-[#1a1a1a]!"
      : "border-[#eee6dc]! bg-[#faf7f3]! [&>span]:text-[#5f5550]!",
  ].join(" ");

  /** Same treatment, squared on the right so it butts against the number.
      Fixed height (matching the number input) so the two halves align as one
      field rather than one box sitting shorter than the other. */
  const codeButtonClass = [
    "h-[50px]! rounded-l-xl! rounded-r-none! px-3! py-0! text-[15px]!",
    "border-[#e6dcd0]! bg-white!",
    isEditing ? "hover:border-[#c9bcae]!" : "border-[#eee6dc]! bg-[#faf7f3]! text-[#5f5550]!",
  ].join(" ");

  /**
   * Country code + number as one control.
   *
   * Behaviour is unchanged from main — the two halves still write to separate
   * fields and Profile joins them into "+91 98765..." on save. Only the
   * borders and fills are restyled, and the seam is handled: the number input
   * drops its left border and its left radius so the pair reads as a single
   * field rather than two boxes touching.
   */
  const renderPhoneField = ({
    id,
    label,
    icon: Icon,
    code,
    number,
    codeField,
    numberField,
    placeholder,
  }: {
    id: string;
    label: string;
    icon: typeof Phone;
    code: string;
    number: string;
    codeField: keyof UserProfile;
    numberField: keyof UserProfile;
    placeholder: string;
  }) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        <Icon className="h-4 w-4 text-[#a89a8d]" />
        {label}
      </label>
      <div className="flex items-stretch">
        <div className="w-[116px] shrink-0">
          <CountryCodeSelect
            value={code || "+91"}
            onChange={(v) => handleInputChange(codeField, v)}
            disabled={!isEditing}
            buttonClassName={codeButtonClass}
          />
        </div>
        <input
          id={id}
          type="tel"
          value={number}
          onChange={(e) => handleInputChange(numberField, e.target.value)}
          disabled={!isEditing}
          placeholder={placeholder}
          className={`${fieldClass} h-[50px] min-w-0 flex-1 rounded-l-none border-l-0 py-0`}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="rounded-2xl border border-[#efe4d8] bg-white p-4 shadow-[0_10px_30px_-24px_rgba(74,50,38,0.5)] sm:p-6 lg:p-7">
        {/* ── Card header ──────────────────────────────────────────────────
            The heading and the control that acts on it, on one line. */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#f2e9df] pb-5">
          <div>
            <span className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c41617]">
              <span aria-hidden className="h-px w-5 bg-[#c41617]" />
              Personal information
            </span>
            <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">
              Profile Information
            </h2>
          </div>

          {!isEditing ? (
            <button
              onClick={onEdit}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#e8d2cb] bg-[#fdf3f0] px-5 py-2.5 text-[13px] font-semibold text-[#7a0f10] transition-all duration-300 hover:border-[#e01a1b] hover:bg-[#e01a1b] hover:text-white"
            >
              <SquarePen className="h-4 w-4" />
              Edit profile
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              {/* Brand red, not green. Green was the only one on the site and
                  it read as a status colour rather than the primary action. */}
              <button
                onClick={onSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-[#e01a1b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.8)] transition-all duration-300 hover:bg-[#c41617] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full border border-[#e6dcd0] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5f5550] transition-colors duration-200 hover:bg-[#faf7f3] disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* ── The fields ───────────────────────────────────────────────────
            One four-column grid, with fields spanning it so every row fills
            exactly. Eight fields in three complete rows:

              Title  · First · Middle · Last
              Gender · Email(3)
              Phone(2)        · WhatsApp(2)

            Two earlier attempts failed here and both failures were visible.
            Splitting into "personal" and "contact" bands left Gender alone on
            a row with three empty columns beside it — which reads as a gap,
            not as a group. And putting all three contact fields on one row
            gave each about 275px, of which the country selector takes 112, so
            the WhatsApp placeholder truncated mid-word.

            Spanning fixes both at once. Gender lands directly beneath Title in
            the same column, so the two dropdowns line up and read as a pair.
            Email gets three columns, which is what a long address wants. Phone
            and WhatsApp get two each — roughly 320px for the number after the
            selector, so nothing clips.

            The sub-group divider is gone with it: rows this even do not need
            a label to explain themselves. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-4 md:gap-x-5 md:gap-y-6">
          <div>
            <label htmlFor="title" className={labelClass}>Title</label>
            <Dropdown
              id="title"
              value={editedProfile.title || ""}
              options={TITLE_OPTIONS}
              onChange={(value) => handleInputChange("title", value as string)}
              placeholder="Title"
              disabled={!isEditing}
              buttonClassName={dropdownButtonClass}
            />
          </div>
          <div>
            <label htmlFor="firstName" className={labelClass}>First name</label>
            <input
              id="firstName"
              type="text"
              value={editedProfile.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              disabled={!isEditing}
              placeholder="First name"
              autoComplete="given-name"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="middleName" className={labelClass}>Middle name</label>
            <input
              id="middleName"
              type="text"
              value={editedProfile.middleName || ""}
              onChange={(e) => handleInputChange("middleName", e.target.value)}
              disabled={!isEditing}
              placeholder="Middle name"
              autoComplete="additional-name"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>Last name</label>
            <input
              id="lastName"
              type="text"
              value={editedProfile.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              disabled={!isEditing}
              placeholder="Last name"
              autoComplete="family-name"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="gender" className={labelClass}>Gender</label>
            <Dropdown
              id="gender"
              value={editedProfile.gender}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
              onChange={(value) => handleInputChange("gender", value as string)}
              placeholder="Select gender"
              disabled={!isEditing}
              buttonClassName={dropdownButtonClass}
            />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="email" className={labelClass}>
              <Mail className="h-4 w-4 text-[#a89a8d]" />
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={editedProfile.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your email address"
              autoComplete="email"
              className={fieldClass}
            />
          </div>

          <div className="md:col-span-2">
            {renderPhoneField({
              id: "phone",
              label: "Phone number",
              icon: Phone,
              code: editedProfile.phoneCode || "+91",
              number: editedProfile.phone,
              codeField: "phoneCode",
              numberField: "phone",
              placeholder: "Phone number",
            })}
          </div>
          <div className="md:col-span-2">
            {renderPhoneField({
              id: "whatsapp",
              label: "WhatsApp number",
              icon: MessageCircle,
              code: editedProfile.whatsappCode || "+91",
              number: editedProfile.whatsapp || "",
              codeField: "whatsappCode",
              numberField: "whatsapp",
              placeholder: "WhatsApp number",
            })}
          </div>
        </div>
      </div>

      {/* ── Footnote ────────────────────────────────────────────────────────
          Outside the card, on the page ground. It was a full-width
          bootstrap-blue alert inside the card — the only blue on the site —
          which gave a pointer to another tab more weight than it earns and
          made it look like something you had to read before saving. */}
      <div className="mt-3 flex items-start gap-2 px-1">
        <MapPin aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a89a8d]" />
        <div className="text-[13px] leading-relaxed">
          <p className="font-semibold text-[#1a1a1a]">
            Looking for your shipping addresses?
          </p>
          <p className="text-[#7a6d62]">
            Manage your saved addresses in the{" "}
            {/* A button, not a Link: the tabs are component state, not routes —
                /profile is one URL. It was styled like a link and did nothing. */}
            <button
              type="button"
              onClick={onGoToAddresses}
              className="rounded-sm font-semibold text-[#7a0f10] underline decoration-[#e0c4bd] decoration-1 underline-offset-2 transition-colors hover:text-[#e01a1b] hover:decoration-[#e01a1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e01a1b]"
            >
              Saved Addresses
            </button>{" "}
            tab.
          </p>
        </div>
      </div>
    </>
  );
}
