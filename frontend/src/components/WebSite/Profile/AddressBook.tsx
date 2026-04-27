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

const TYPE_META: Record<string, { label: string; icon: typeof Home; badgeCls: string }> = {
  home: { label: "Home", icon: Home, badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  work: { label: "Work", icon: Briefcase, badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  other: { label: "Other", icon: MapPin, badgeCls: "bg-slate-50 text-slate-700 border-slate-200" },
};

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
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-gray-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Saved Addresses</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {addresses.length} of {MAX_SAVED_ADDRESSES} addresses used
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAdd}
            disabled={atLimit}
            className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={atLimit ? `Limit of ${MAX_SAVED_ADDRESSES} addresses reached` : "Add new address"}
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                addr={addr}
                busy={busyId === addr.id}
                onEdit={() => openEdit(addr)}
                onDelete={() => setConfirmDeleteId(addr.id)}
                onSetDefault={() => handleSetDefault(addr)}
              />
            ))}
          </div>
        )}

        {atLimit && (
          <p className="mt-4 text-xs text-slate-500 text-center">
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
      className={`relative border-2 rounded-xl p-5 transition-all ${
        addr.isDefault
          ? "border-gray-800 bg-gradient-to-br from-gray-50 to-white shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-full ${meta.badgeCls}`}>
          <Icon className="w-3.5 h-3.5" />
          {meta.label}
        </span>
        {addr.isDefault && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gray-800 text-white rounded-full">
            <Star className="w-3 h-3 fill-white" />
            Default
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-semibold text-slate-900">{addr.name}</p>
        <p className="text-slate-600">{addr.phone}</p>
        <p className="text-slate-700 pt-1">
          {addr.address}
          {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
        </p>
        <p className="text-slate-700">
          {addr.city}, {addr.state} {addr.zipCode}
        </p>
        <p className="text-slate-500 text-xs">{addr.country || "United States"}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {!addr.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={busy}
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 hover:underline disabled:opacity-50 flex items-center gap-1"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
            Set as default
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
      <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <h3 className="text-base font-semibold text-slate-900 mb-1">No saved addresses yet</h3>
      <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
        Save your shipping addresses to check out faster next time.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium rounded-lg shadow-sm"
      >
        <Plus className="w-4 h-4" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete address?</h3>
        <p className="text-sm text-slate-600 mb-6">
          This address will be permanently removed. If it&apos;s your default, the next most recent address will become the default.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
