"use client";

import { useEffect, useState } from "react";
import { Plus, MapPin, Home, Briefcase, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import AddressFormModal from "./AddressFormModal";
import {
  addressService,
  MAX_SAVED_ADDRESSES,
  type SavedAddress,
  type AddressPayload,
} from "@/services/addressService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { getCountryName, getStateName, formatPhoneForDisplay } from "@/components/WebSite/CheckOut/CheckoutProcess/constants";
import Reveal from "@/components/WebSite/Shared/Reveal";

/**
 * Saved Addresses.
 *
 * Presentation only — every service call, optimistic update and handler below
 * is unchanged. What changed is that this tab now looks like the page it sits
 * in: warm linen and oxblood instead of slate grey, and the same card header
 * (small label, rule, heading, action on the right) that Profile Information
 * uses, so moving between tabs does not feel like moving between sites.
 */

/**
 * Home / Work / Other used to be emerald, red and slate — three different
 * colours for a label that carries no urgency. They are one quiet badge now
 * and the icon does the distinguishing, which leaves exactly one coloured
 * thing on a card: the Default star, the only part that changes what happens
 * at checkout.
 */
const TYPE_META: Record<string, { label: string; icon: typeof Home }> = {
  home: { label: "Home", icon: Home },
  work: { label: "Work", icon: Briefcase },
  other: { label: "Other", icon: MapPin },
};

const CARD =
  "rounded-2xl border border-[#efe4d8] bg-white p-4 shadow-[0_10px_30px_-24px_rgba(74,50,38,0.5)] sm:p-6 lg:p-7";

const PRIMARY_BTN =
  "inline-flex shrink-0 items-center gap-2 rounded-full bg-[#e01a1b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(224,26,27,0.8)] transition-all duration-300 hover:bg-[#c41617] disabled:cursor-not-allowed disabled:opacity-60";

export default function AddressBook() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const list = await addressService.list();
      setAddresses(list);
    } catch (err: any) {
      showErrorToast("Load Failed", err?.message || "Could not load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const atLimit = addresses.length >= MAX_SAVED_ADDRESSES;

  const openAdd = () => {
    if (atLimit) return;
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (addr: SavedAddress) => {
    setEditing(addr);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: AddressPayload) => {
    if (editing) {
      await addressService.update(editing.id, payload);
      showSuccessToast("Address Updated", "Your address has been saved.");
    } else {
      await addressService.create(payload);
      showSuccessToast("Address Added", "Your new address is saved.");
    }
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleSetDefault = async (addr: SavedAddress) => {
    if (addr.isDefault) return;
    // Optimistic: flip isDefault flags locally immediately, revert on failure.
    const previous = addresses;
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === addr.id })));
    try {
      setBusyId(addr.id);
      await addressService.setDefault(addr.id);
      showSuccessToast("Default Updated", `${formatTypeLabel(addr)} is now your default.`);
    } catch (err: any) {
      setAddresses(previous);
      showErrorToast("Failed", err?.message || "Could not set default");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic: remove from local state immediately. On failure, restore and toast.
    const previous = addresses;
    const removed = addresses.find((a) => a.id === id);
    if (!removed) return;
    // Promote next default locally if we're removing the current default (server does the same).
    let next = addresses.filter((a) => a.id !== id);
    if (removed.isDefault && next.length > 0 && !next.some((a) => a.isDefault)) {
      next = next.map((a, i) => (i === 0 ? { ...a, isDefault: true } : a));
    }
    setAddresses(next);
    setConfirmDeleteId(null);
    try {
      setBusyId(id);
      await addressService.remove(id);
      showSuccessToast("Address Deleted", "The address has been removed.");
      // Re-sync with server to pick up any default-promotion tie-breaking differences.
      await load();
    } catch (err: any) {
      setAddresses(previous);
      showErrorToast("Failed", err?.message || "Could not delete address");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    /* Mirrors the loaded tab — same card, same header block, same two-column
       grid — so nothing shifts or changes colour when the fetch lands. */
    return (
      <div className={CARD}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#f2e9df] pb-5">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[#f3ece3]" />
            <div className="h-7 w-48 animate-pulse rounded bg-[#ece2d6]" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-full bg-[#f3ece3]" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-[#efe4d8] p-5">
              <div className="flex justify-between">
                <div className="h-6 w-20 animate-pulse rounded-full bg-[#f3ece3]" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-[#f3ece3]" />
              </div>
              <div className="h-4 w-2/5 animate-pulse rounded bg-[#ece2d6]" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#f3ece3]" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-[#f3ece3]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={CARD}>
        {/* ── Card header ──────────────────────────────────────────────────
            Identical rhythm to Profile Information: label, heading, and the
            one control that acts on the whole card, on the right. */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#f2e9df] pb-5">
          <div className="min-w-0">
            <span className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c41617]">
              <span aria-hidden className="h-px w-5 bg-[#c41617]" />
              Where we deliver
            </span>
            <h2 className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl">
              Saved Addresses
            </h2>
            <p className="mt-1 text-[13px] text-[#7a6d62]">
              {addresses.length} of {MAX_SAVED_ADDRESSES} saved
            </p>
          </div>

          <button
            type="button"
            onClick={openAdd}
            disabled={atLimit}
            className={PRIMARY_BTN}
            title={atLimit ? `Limit of ${MAX_SAVED_ADDRESSES} addresses reached` : "Add new address"}
          >
            <Plus className="h-4 w-4" />
            Add address
          </button>
        </div>

        {addresses.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {addresses.map((addr, index) => (
              <Reveal key={addr.id} delay={index * 90}>
                <AddressCard
                  addr={addr}
                  busy={busyId === addr.id}
                  onEdit={() => openEdit(addr)}
                  onDelete={() => setConfirmDeleteId(addr.id)}
                  onSetDefault={() => handleSetDefault(addr)}
                />
              </Reveal>
            ))}
          </div>
        )}

        {atLimit && (
          <p className="mt-5 text-center text-xs text-[#7a6d62]">
            You&apos;ve reached the {MAX_SAVED_ADDRESSES}-address limit. Delete one to add a new address.
          </p>
        )}
      </div>

      <AddressFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        editing={editing}
        allowDefaultToggle={true}
        hasNoAddressesYet={addresses.length === 0}
      />

      {confirmDeleteId && (
        <DeleteConfirmDialog
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDelete(confirmDeleteId)}
          busy={busyId === confirmDeleteId}
        />
      )}
    </>
  );
}

function formatTypeLabel(addr: SavedAddress) {
  return TYPE_META[addr.type]?.label || "Address";
}

function AddressCard({
  addr,
  busy,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  addr: SavedAddress;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const meta = TYPE_META[addr.type] || TYPE_META.other;
  const Icon = meta.icon;

  return (
    <div
      /* 1px border, not 2px. A 2px border around every card put more ink into
         the frames than into the addresses inside them. The default card is
         marked by a warm tint and its badge rather than by a heavier line. */
      className={`relative h-full rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-24px_rgba(74,50,38,0.6)] ${
        addr.isDefault
          ? "border-[#e8d2cb] bg-[#fdf8f6]"
          : "border-[#efe4d8] bg-white hover:border-[#e6dcd0]"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6dcd0] bg-[#faf7f3] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5f5550]">
          <Icon className="h-3.5 w-3.5 text-[#a89a8d]" />
          {meta.label}
        </span>
        {addr.isDefault && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e01a1b] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
            <Star className="h-3 w-3 fill-white" />
            Default
          </span>
        )}
      </div>

      {/* The recipient is the line you scan for when you have three of these,
          so it is set larger than the address beneath it rather than one
          weight heavier at the same size. */}
      <p className="text-[15px] font-semibold text-[#1a1a1a]">{addr.name}</p>
      <p className="mt-0.5 text-[13px] text-[#7a6d62]">
        {formatPhoneForDisplay(addr.phone, addr.country)}
      </p>

      <div className="mt-3 space-y-0.5 text-[13.5px] leading-relaxed text-[#5f5550]">
        <p>
          {addr.address}
          {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
        </p>
        <p>
          {addr.city}, {getStateName(addr.state, addr.country)} {addr.zipCode}
        </p>
        <p className="text-xs text-[#a89a8d]">{getCountryName(addr.country) || "—"}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f2e9df] pt-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="rounded-lg p-2 text-[#7a6d62] transition-colors hover:bg-[#faf7f3] hover:text-[#1a1a1a] disabled:opacity-50"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-lg p-2 text-[#a89a8d] transition-colors hover:bg-[#fdf3f0] hover:text-[#c41617] disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {!addr.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#7a0f10] transition-colors hover:text-[#e01a1b] hover:underline disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
            Set as default
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state.
 *
 * The dashed border is gone, for the same reason it went from Profile
 * Information: dashes read as "drop a file here" or "not built yet". An empty
 * address book is neither — it is a normal, correct state for a new customer.
 * A tinted panel says the same thing without suggesting something is broken.
 */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-[#efe4d8] bg-[#faf7f3] px-6 py-12 text-center">
      <span
        aria-hidden
        className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#fdf3f0] text-[#7a0f10]"
      >
        <MapPin className="h-5 w-5" />
      </span>
      <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a]">
        No saved addresses yet
      </h3>
      <p className="mx-auto mt-1.5 mb-6 max-w-sm text-sm leading-relaxed text-[#5f5550]">
        Save your shipping addresses to check out faster next time.
      </p>
      <button type="button" onClick={onAdd} className={PRIMARY_BTN}>
        <Plus className="h-4 w-4" />
        Add your first address
      </button>
    </div>
  );
}

function DeleteConfirmDialog({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1d16]/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-address-title"
        className="w-full max-w-md rounded-2xl border border-[#efe4d8] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(42,29,22,0.7)]"
      >
        <h3
          id="delete-address-title"
          className="mb-2 font-playfair text-lg font-semibold text-[#1a1a1a]"
        >
          Delete address?
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-[#5f5550]">
          This address will be permanently removed. If it&apos;s your default, the next most recent address will become the default.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-[#e6dcd0] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#5f5550] transition-colors hover:bg-[#faf7f3] disabled:opacity-50"
          >
            Cancel
          </button>
          {/* Deleting is the destructive path, so it does not get the same
              button as "Add address" — oxblood rather than brand red. */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#7a0f10] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#5d0b0c] disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
