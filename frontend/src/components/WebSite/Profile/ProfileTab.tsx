"use client";

import { Mail, Phone, SquarePen, Save, X, MapPin } from "lucide-react";
import Dropdown from "@/components/UI/Dropdown";
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
 * Three changes, all presentational.
 *
 *  1. The dashed box is gone. A dashed border means "drop something here" or
 *     "not finished yet" — it is an upload affordance. Wrapped around a form
 *     section it made a finished page look unbuilt, and it put a second frame
 *     inside a card that was already a frame. The section is announced by a
 *     small label and a rule instead, the way the rest of the site does it.
 *
 *  2. Edit, Save and Cancel moved here from the sidebar. They belong beside
 *     the fields they unlock — and in the sidebar they were shown on the
 *     Orders and Support tabs too, where pressing Edit put the form into an
 *     edit mode the reader could not see.
 *
 *  3. Warm palette. This page was slate grey with a blue notice; the
 *     storefront is linen, cream and oxblood. Side by side they did not read
 *     as the same product.
 */
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
   * Gender is the one field that is not an <input>, and it showed.
   *
   * Dropdown paints its own disabled state as bg-gray-100 / text-gray-500 /
   * border-gray-300 — cool grey — while every field beside it locks to warm
   * cream. Side by side it read as a control borrowed from another app.
   *
   * Overridden here rather than in Dropdown, which has 67 call sites across
   * admin, vendor and checker: changing its defaults to suit one customer form
   * would repaint all of them.
   *
   * The `!` suffixes are load-bearing. Dropdown's colours are plain utilities
   * applied in the same layer as these, so class order in the attribute
   * decides nothing — without important, which one wins depends on the order
   * Tailwind happens to emit them in.
   *
   * `[&>span]` reaches the inner label span, which carries its own
   * text-gray-900 and would otherwise stay near-black while every other locked
   * field faded to #5f5550.
   */
  const dropdownButtonClass = [
    'rounded-xl! py-3! text-[15px]!',
    'border-[#e6dcd0]! bg-white!',
    isEditing
      ? 'hover:border-[#c9bcae]! [&>span]:text-[#1a1a1a]!'
      : 'border-[#eee6dc]! bg-[#faf7f3]! [&>span]:text-[#5f5550]!',
  ].join(' ');

  return (
    <>
    <div className="rounded-2xl border border-[#efe4d8] bg-white p-4 shadow-[0_10px_30px_-24px_rgba(74,50,38,0.5)] sm:p-6 lg:p-7">
      {/* ── Card header ────────────────────────────────────────────────────
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
            {/* Brand red, not green. Green was the only one on the site and it
                read as a status colour rather than as the primary action. */}
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div>
          <label htmlFor="firstName" className={labelClass}>First name</label>
          <input
            id="firstName"
            type="text"
            value={editedProfile.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            disabled={!isEditing}
            placeholder="Enter your first name"
            autoComplete="given-name"
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
            placeholder="Enter your last name"
            autoComplete="family-name"
            className={fieldClass}
          />
        </div>

        <div>
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

        <div>
          <label htmlFor="phone" className={labelClass}>
            <Phone className="h-4 w-4 text-[#a89a8d]" />
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={editedProfile.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            disabled={!isEditing}
            placeholder="Enter your phone number"
            autoComplete="tel"
            className={fieldClass}
          />
        </div>

        <div>
          {/* Its own label rather than Dropdown's, which is hardcoded
              text-sm/text-gray-700 and so sat at a different size, weight and
              colour from the four labels above it. htmlFor still points at the
              Dropdown button via its id. */}
          <label htmlFor="gender" className={labelClass}>Gender</label>
          {/* Dropdown has always accepted a `disabled` prop and this never
              passed it, so Gender stayed openable while every field beside it
              was locked. */}
          <Dropdown
            id="gender"
            value={editedProfile.gender}
            disabled={!isEditing}
            buttonClassName={dropdownButtonClass}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
            onChange={(value) => handleInputChange("gender", value as string)}
            placeholder="Select gender"
          />
        </div>

      </div>
    </div>

    {/* ── Footnote ──────────────────────────────────────────────────────────
        Outside the card, on the page ground.

        It has been three things: a full-width bootstrap-blue alert inside the
        card, then a panel filling the empty sixth cell of the field grid.
        Both gave it more weight than it earns — it is a pointer to another
        tab, not part of the form, and boxing it made it look like something
        you had to read before saving.

        No box, no border, no icon badge. A caption under a card reads as a
        caption. */}
    <div className="mt-3 flex items-start gap-2 px-1">
      <MapPin aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a89a8d]" />
      <div className="text-[13px] leading-relaxed">
        {/* The original two-line wording, kept. It asks the question the
            reader is actually holding before answering it, which one flat
            statement did not. Only the container changed: this used to be a
            bootstrap-blue alert box inside the card. */}
        <p className="font-semibold text-[#1a1a1a]">
          Looking for your shipping addresses?
        </p>
        <p className="text-[#7a6d62]">
          Manage your saved addresses in the{" "}
          {/* A button, not a Link: the tabs are component state, not routes —
              /profile is one URL. It was styled like a link and did nothing,
              which is worse than plain text. Underlined at rest rather than
              only on hover, since nothing else marks it as clickable. */}
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
