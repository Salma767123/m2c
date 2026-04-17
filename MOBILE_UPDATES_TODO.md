# Mobile App Updates from Web Changes

## Overview
The web app received updates focused on:
1. Backend API optimization (reduced data payload)
2. UI/UX improvements (better loading states, status labels, layout)
3. Dashboard enhancements (better organization, sorting)

---

## 1. BACKEND API CHANGES ✓ (Already Compatible)

### inspectionController.js
- **Removed sort field**: `vendorName` from allowed sort fields
- **Optimized response**: Changed from `include` to `select` (returns only needed fields)
- **Impact on Mobile**: ✅ No changes needed - mobile already uses correct fields

### qcCheckerController.js
- **Removed sort fields**: `companyName` (vendors), `name` (products)
- **Optimized product response**: Using `select` instead of `include`
- **Impact on Mobile**: ✅ No changes needed - mobile already compatible

---

## 2. DASHBOARD IMPROVEMENTS 🔄 (Need to Implement)

### Current Web Changes:
```typescript
// Better stat calculations
- Separate product and vendor counts
- Show "X Products · Y Vendors" in trend text
- Better status labels (e.g., "Approved by QC" vs "QC_APPROVED")
```

### Mobile Implementation Tasks:

#### Task 2.1: Update Dashboard Stats Display
**File**: `checker_app/src/components/Dashboard/CheckerDashboard.tsx`

**Changes Needed**:
- [ ] Fetch completed inspections for vendor stats
- [ ] Separate product counts from vendor counts
- [ ] Update stat card trend text to show breakdown (e.g., "5 Products · 3 Vendors")
- [ ] Add helper function for pluralization: `pl(n, word)`

**Code Pattern**:
```typescript
// Add to stats calculation
const pendingProducts = assignedProducts.filter(p => 
  p.approvalStatus === 'PENDING' || p.approvalStatus === 'REINSPECTION'
).length
const pendingVendors = assignedVendors.filter(v => 
  v.status === 'UNDER_REVIEW' || v.status === 'PENDING'
).length

// Update trend text
trend: `${pl(pendingProducts, "Product")} · ${pl(pendingVendors, "Vendor")}`
```

---

#### Task 2.2: Improve Dashboard Layout
**File**: `checker_app/src/components/Dashboard/CheckerDashboard.tsx`

**Changes Needed**:
- [ ] Add better loading skeleton (replace spinner with card skeletons)
- [ ] Separate Products and Vendors sections with headers
- [ ] Sort items by date (newest first)
- [ ] Add item counts in section headers
- [ ] Improve card hover effects
- [ ] Remove the "Summary Statistics" panel (not needed)

**UI Pattern**:
```tsx
{/* Products Section */}
<View className="mb-6">
  <View className="flex-row items-center gap-2 mb-3">
    <Package size={16} color="#2563eb" />
    <Text className="text-sm font-bold text-gray-700">PRODUCTS</Text>
    <Text className="text-xs text-gray-400">({products.length})</Text>
  </View>
  <ScrollView className="max-h-64">
    {/* Product cards */}
  </ScrollView>
</View>
```

---

## 3. STATUS LABEL IMPROVEMENTS 🔄 (Need to Implement)

### Current Web Changes:
```typescript
const STATUS_LABELS = {
  APPROVED: "Approved by Admin",
  QC_APPROVED: "Approved by QC",
  REJECTED: "Rejected",
  REINSPECTION: "Reinspection",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review by Admin",
  SUSPENDED: "Suspended",
}
```

### Mobile Implementation Tasks:

#### Task 3.1: Add Status Label Mapping
**Files**: 
- `checker_app/src/app/(tabs)/products.tsx`
- `checker_app/src/app/(tabs)/vendors.tsx`
- `checker_app/src/components/Dashboard/CheckerDashboard.tsx`

**Changes Needed**:
- [ ] Create `STATUS_LABELS` constant in each file
- [ ] Create `formatStatus()` helper function
- [ ] Replace all status displays to use formatted labels
- [ ] Update filter dropdowns to show formatted labels

**Code Pattern**:
```typescript
const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved by Admin",
  QC_APPROVED: "Approved by QC",
  REJECTED: "Rejected",
  REINSPECTION: "Reinspection",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review by Admin",
  SUSPENDED: "Suspended",
}

const formatStatus = (status: string) => 
  STATUS_LABELS[status] || status.replace(/_/g, " ")
```

---

## 4. SORT OPTIONS UPDATE 🔄 (Need to Implement)

### Current Web Changes:
- **Removed**: Name sorting (A-Z, Z-A) from products
- **Removed**: Company name sorting from vendors
- **Reason**: Backend no longer supports these sort fields

### Mobile Implementation Tasks:

#### Task 4.1: Update Sort Options
**File**: `checker_app/src/app/(tabs)/products.tsx`

**Changes Needed**:
- [ ] Remove name sorting options from SORT_OPTIONS array

**Before**:
```typescript
const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },  // ❌ Remove
  { value: 'name:desc', label: 'Name Z–A' }, // ❌ Remove
  { value: 'basePrice:asc', label: 'Price low–high' },
  { value: 'basePrice:desc', label: 'Price high–low' },
]
```

**After**:
```typescript
const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'basePrice:asc', label: 'Price low–high' },
  { value: 'basePrice:desc', label: 'Price high–low' },
]
```

#### Task 4.2: Update Vendor Sort Options
**File**: `checker_app/src/app/(tabs)/vendors.tsx`

**Changes Needed**:
- [ ] Remove company name sorting if it exists
- [ ] Keep only: submittedAt, status sorting

---

## 5. LOADING STATE IMPROVEMENTS 🔄 (Need to Implement)

### Current Web Changes:
- Better skeleton loading (shows table structure)
- More detailed loading placeholders
- Smoother transitions

### Mobile Implementation Tasks:

#### Task 5.1: Add Skeleton Loading
**Files**: 
- `checker_app/src/app/(tabs)/products.tsx`
- `checker_app/src/app/(tabs)/vendors.tsx`

**Changes Needed**:
- [ ] Replace spinner with skeleton cards during initial load
- [ ] Show placeholder cards that match actual card layout
- [ ] Add shimmer animation effect

**Pattern**:
```tsx
{loading && items.length === 0 ? (
  <View className="space-y-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <View key={i} className="bg-white rounded-xl p-4 border border-gray-200">
        <View className="flex-row items-center gap-3 mb-3">
          <View className="w-12 h-12 bg-gray-200 rounded-lg" />
          <View className="flex-1 space-y-2">
            <View className="h-4 bg-gray-200 rounded w-32" />
            <View className="h-3 bg-gray-100 rounded w-20" />
          </View>
        </View>
        <View className="h-9 bg-gray-100 rounded-lg" />
      </View>
    ))}
  </View>
) : (
  // Actual content
)}
```

---

## 6. FILTER DROPDOWN LABELS 🔄 (Need to Implement)

### Current Web Changes:
```typescript
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REINSPECTION', label: 'Reinspection' },
  { value: 'QC_APPROVED', label: 'Approved by QC' },      // Changed
  { value: 'APPROVED', label: 'Approved by Admin' },      // Changed
  { value: 'REJECTED', label: 'Rejected' },
]
```

### Mobile Implementation Tasks:

#### Task 6.1: Update Filter Labels
**File**: `checker_app/src/app/(tabs)/products.tsx`

**Changes Needed**:
- [ ] Update STATUS_OPTIONS labels to match web
- [ ] Ensure consistency across all status displays

---

## IMPLEMENTATION PRIORITY

### High Priority (Do First):
1. ✅ Task 4.1 & 4.2: Remove unsupported sort options (prevents API errors)
2. ✅ Task 3.1: Add status label mapping (better UX)
3. ✅ Task 6.1: Update filter dropdown labels (consistency)

### Medium Priority (Do Next):
4. Task 2.1: Update dashboard stats display
5. Task 5.1: Add skeleton loading states

### Low Priority (Nice to Have):
6. Task 2.2: Improve dashboard layout organization

---

## TESTING CHECKLIST

After implementing each task:
- [ ] Products list loads correctly
- [ ] Vendors list loads correctly
- [ ] Dashboard displays correct stats
- [ ] Sort options work without errors
- [ ] Status labels display correctly
- [ ] Filter dropdowns show proper labels
- [ ] Loading states look good
- [ ] No console errors

---

## NOTES

- Backend changes are already compatible with mobile
- Focus on UI/UX consistency with web
- All changes are non-breaking
- Can implement incrementally
