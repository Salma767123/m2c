"use client";

import { useRef } from "react";
import { MapPin, Home, Briefcase, Star, Plus, Check, Pencil } from "lucide-react";
import type { SavedAddress } from "@/services/addressService";
import { getStateName, formatPhoneForDisplay } from "./constants";

interface AddressSelectorProps {
  addresses: SavedAddress[];
  selectedId: string | null;
  useNewAddress: boolean;
  onSelect: (id: string) => void;
  onChooseNew: () => void;
  onEdit?: (id: string) => void;
  disabled?: boolean;
}

const TYPE_META: Record<string, { label: string; icon: typeof Home }> = {
  home: { label: "Home", icon: Home },
  work: { label: "Work", icon: Briefcase },
  other: { label: "Other", icon: MapPin },
};

export default function AddressSelector({
  addresses,
  selectedId,
  useNewAddress,
  onSelect,
  onChooseNew,
  onEdit,
  disabled,
}: AddressSelectorProps) {
  // Tab stops: each address card + the "Use a new address" tile. Arrow keys move focus between them.
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  if (addresses.length === 0) return null;

  const totalItems = addresses.length + 1; // +1 for "new address" tile

  const focusItem = (index: number) => {
    const clamped = (index + totalItems) % totalItems;
    itemRefs.current[clamped]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number, onActivate: () => void) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusItem(currentIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusItem(currentIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(totalItems - 1);
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        onActivate();
        break;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 id="saved-address-heading" className="text-sm font-semibold text-slate-900">
          Ship to a saved address
        </h3>
        <span className="text-xs text-slate-500">{addresses.length} saved</span>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="saved-address-heading"
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {addresses.map((addr, idx) => {
          const meta = TYPE_META[addr.type] || TYPE_META.other;
          const Icon = meta.icon;
          const selected = !useNewAddress && selectedId === addr.id;
          // Only the currently selected card is in the tab order; arrow keys move between cards.
          const tabIndex = selected || (!selectedId && idx === 0) ? 0 : -1;
          return (
            <div
              key={addr.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              role="radio"
              aria-checked={selected}
              tabIndex={disabled ? -1 : tabIndex}
              onClick={() => { if (!disabled) onSelect(addr.id); }}
              onKeyDown={(e) => { if (!disabled) handleKeyDown(e, idx, () => onSelect(addr.id)); }}
              className={`relative text-left border-2 rounded-xl p-4 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-500 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${
                selected
                  ? "border-gray-800 bg-gradient-to-br from-gray-50 to-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(addr.id); }}
                    className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                    title="Edit address"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {selected && (
                  <span className="w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-700 rounded-full">
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </span>
                {addr.isDefault && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-gray-800 text-white rounded-full">
                    <Star className="w-2.5 h-2.5 fill-white" />
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-900 truncate">{addr.name}</p>
              <p className="text-xs text-slate-600 truncate">{formatPhoneForDisplay(addr.phone, addr.country)}</p>
              <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                {addr.address}
                {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}, {getStateName(addr.state, addr.country)} {addr.zipCode}
              </p>
            </div>
          );
        })}

        <button
          ref={(el) => { itemRefs.current[addresses.length] = el; }}
          role="radio"
          aria-checked={useNewAddress}
          tabIndex={disabled ? -1 : useNewAddress ? 0 : -1}
          type="button"
          onClick={onChooseNew}
          onKeyDown={(e) => handleKeyDown(e, addresses.length, onChooseNew)}
          disabled={disabled}
          className={`relative text-left border-2 border-dashed rounded-xl p-4 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-center gap-2 min-h-[140px] disabled:opacity-60 disabled:cursor-not-allowed ${
            useNewAddress
              ? "border-gray-800 bg-gray-50 text-gray-900"
              : "border-slate-300 bg-white text-slate-600 hover:border-slate-500 hover:text-slate-900"
          }`}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-semibold">Use a new address</span>
        </button>
      </div>
    </div>
  );
}
