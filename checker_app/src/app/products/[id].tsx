import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Package,
  Factory,
  Layers,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  RefreshCw,
  RotateCw,
  AlertCircle,
  Ruler,
  Truck,
  X,
  ClipboardList,
  Image as ImageIcon,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { SectionCard, Button } from '@/components/UI';
import { brand, elevation } from '@/constants/design';

type Tab = 'overview' | 'images' | 'activity';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'images', label: 'Images & Variants' },
  { id: 'activity', label: 'QC Activity' },
];

const APPROVAL_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  REINSPECTION: { bg: '#ffedd5', text: '#9a3412' },
  QC_APPROVED: { bg: '#d1fae5', text: '#065f46' },
  APPROVED: { bg: '#d1fae5', text: '#065f46' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
};

// Friendly labels mirroring the web checker portal (raw enum → readable text).
const APPROVAL_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REINSPECTION: 'Reinspection',
  QC_APPROVED: 'Approved by QC',
  APPROVED: 'Approved by Admin',
  REJECTED: 'Rejected',
};

// Mirror the product form's UOM dropdown labels so the checker sees the full
// term ("Pieces (pcs)") instead of the stored short code ("pcs").
const UOM_LABELS: Record<string, string> = {
  pcs: 'Pieces (pcs)', meters: 'Meters', kg: 'Kilograms (kg)', yards: 'Yards',
  sets: 'Sets', rolls: 'Rolls', pairs: 'Pairs', dozen: 'Dozen',
};
const uomLabel = (uom?: string | null) => (uom ? UOM_LABELS[uom] || uom : '—');

// Resolve a colour name (e.g. "red") to its hex when no hex is stored, so we
// can always show a swatch + the code next to the name.
const COLOR_NAME_HEX: Record<string, string> = {
  black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080',
  silver: '#c0c0c0', red: '#ff0000', green: '#008000', lime: '#00ff00',
  blue: '#0000ff', navy: '#000080', yellow: '#ffff00', magenta: '#ff00ff',
  cyan: '#00ffff', maroon: '#800000', olive: '#808000', purple: '#800080',
  teal: '#008080', orange: '#ffa500', pink: '#ffc0cb', brown: '#a52a2a',
  beige: '#f5f5dc',
};
const resolveHex = (name?: string | null, hex?: string | null): string | undefined => {
  if (hex && /^#[0-9a-fA-F]{3,8}$/.test(hex.trim())) return hex.trim();
  const n = (name || '').trim().toLowerCase();
  return COLOR_NAME_HEX[n];
};

const SUPPORTED_WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz'];
const hasVal = (x: unknown) => x !== null && x !== undefined && x !== '';

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const humanize = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();

const summariseQcData = (data: unknown): Array<{ key: string; value: string }> => {
  if (!data || typeof data !== 'object') return [];
  const out: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out.push({ key: k, value: String(v) });
    }
  }
  return out;
};

export default function ProductDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    if (!product) setLoading(true);
    try {
      const res = await qcCheckerService.getProductDetails(id);
      if (res.success) setProduct(res.data.product);
      else setError('Unable to load product details');
    } catch (err: any) {
      setError(err?.message || 'Failed to load product details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, product]);

  // Refetch product on focus, so a returning user sees the latest
  // approvalStatus from their last action.
  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]),
  );

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading && !product) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={brand[500]} />
        <Text className="mt-4 text-slate-600 text-sm">Loading product…</Text>
      </View>
    );
  }

  if ((error && !product) || !product) {
    return (
      <View className="flex-1 bg-white">
        <Header onBack={() => router.back()} insetsTop={insets.top} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
            <AlertCircle size={36} color="#dc2626" />
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-2 text-center">Something went wrong</Text>
          <Text className="text-base text-slate-600 text-center mb-6">{error || 'Product not found'}</Text>
          <Button label="Try Again" onPress={load} icon={RefreshCw} variant="primary" />
        </View>
      </View>
    );
  }

  const pill = APPROVAL_STYLE[product.approvalStatus] || { bg: '#f1f5f9', text: '#334155' };
  const primaryImage = product.images?.find((i: any) => i.isPrimary)?.url || product.images?.[0]?.url || null;
  const canInspect = ['PENDING', 'REINSPECTION'].includes(product.approvalStatus);
  const v = product.vendor || {};
  const images: any[] = product.images || [];
  const variants: any[] = product.variants || [];
  const fs: Record<string, any> | null | undefined = product.fabricSpecifications;
  const dt = product.dispatchTimeline;
  const careInstructions: string[] = Array.isArray(fs?.careInstructions) ? fs!.careInstructions : [];

  return (
    <View className="flex-1 bg-slate-50">
      <Header onBack={() => router.back()} insetsTop={insets.top} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand[500]} colors={[brand[500]]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="bg-white px-4 pt-4 pb-5 border-b border-slate-100">
          <Text className="text-2xl font-extrabold text-slate-900 mb-1" style={{ lineHeight: 30 }}>
            {product.name}
          </Text>
          <View className="flex-row items-center flex-wrap" style={{ columnGap: 8, rowGap: 6 }}>
            <Text className="text-xs text-slate-500 font-mono">SKU: {product.baseSku}</Text>
            <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: pill.bg }}>
              <Text className="text-[10px] font-bold" style={{ color: pill.text }}>
                {APPROVAL_LABELS[product.approvalStatus] || product.approvalStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary card */}
        <View className="mx-4 mt-4 rounded-2xl p-5" style={[{ backgroundColor: brand[500] }, elevation.card]}>
          <View className="flex-row flex-wrap" style={{ rowGap: 14, columnGap: 0 }}>
            <SummaryStat label="Inspection Status" value={APPROVAL_LABELS[product.approvalStatus] || product.approvalStatus} />
            <SummaryStat label="Inspection Cycle" value={`#${product.inspectionCycleNumber ?? 1}`} />
            <SummaryStat label="Last Inspected" value={fmt(product.approvedAt)} />
            <SummaryStat label="Listed" value={fmt(product.createdAt)} />
          </View>
        </View>

        {/* Start Inspection CTA */}
        {canInspect ? (
          <View className="mx-4 mt-3">
            <Button
              label="Start Inspection"
              icon={FileText}
              variant="primary"
              fullWidth
              onPress={() => router.push({
                pathname: '/product-inspection' as any,
                params: { productId: id, productName: product.name, vendorName: v.companyName || '' },
              })}
            />
          </View>
        ) : null}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 mb-3" contentContainerStyle={{ paddingHorizontal: 12 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
                className={`mx-1 px-4 py-2 rounded-full ${isActive ? 'bg-brand-500' : 'bg-white border border-slate-200'}`}
              >
                <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Overview */}
        {activeTab === 'overview' ? (
          <View className="mx-4" style={{ rowGap: 14 }}>
            {primaryImage ? (
              <TouchableOpacity onPress={() => setLightboxUri(primaryImage)} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <Image source={{ uri: primaryImage }} style={{ width: '100%', aspectRatio: 1 }} resizeMode="cover" />
              </TouchableOpacity>
            ) : null}

            <SectionCard icon={Package} title="Product">
              <InfoRow label="Category" value={product.category} />
              <InfoRow label="Total Stock" value={String(product.totalStock ?? 0)} />
              {product.singleUnitColor ? (
                <InfoRow label="Base Color">
                  <ColorValue name={product.singleUnitColor} hex={product.singleUnitColorHex} />
                </InfoRow>
              ) : null}
              {product.uom ? <InfoRow label="Selling Unit (UOM)" value={uomLabel(product.uom)} /> : null}
              {Array.isArray(product.tags) && product.tags.length > 0 ? (
                <InfoRow label="Tags">
                  <TagChips tags={product.tags} />
                </InfoRow>
              ) : null}
            </SectionCard>

            <SectionCard icon={Factory} title="Vendor">
              <InfoRow label="Company" value={v.companyName} />
              <InfoRow label="Owner" value={v.ownerName} />
              <InfoRow label="Primary Email" value={v.businessEmail || v.email} onPress={() => {}} />
              {v.businessEmail2 ? <InfoRow label="Secondary Email" value={v.businessEmail2} /> : null}
              <InfoRow label="Primary Phone" value={v.businessPhone} />
              {v.phoneNumber2 ? <InfoRow label="Secondary Phone" value={v.phoneNumber2} /> : null}
              <InfoRow
                label="Factory Location"
                value={[v.factoryAddress, v.factoryCity, v.factoryState, v.factoryZipCode, v.factoryCountry].filter(Boolean).join(', ')}
              />
            </SectionCard>

            {/* Fabric & Specifications */}
            {(product.fabricType || product.material || fs) ? (
              <SectionCard icon={Ruler} title="Fabric & Specifications">
                <InfoRow label="Fabric Type" value={product.fabricType} />
                <InfoRow label="Material Description" value={product.material} />
                {hasVal(fs?.composition) ? <InfoRow label="Composition" value={String(fs!.composition)} /> : null}
                {hasVal(fs?.weightValue) ? <InfoRow label="Weight" value={`${fs!.weightValue} g`} /> : null}
                {hasVal(fs?.length) ? <InfoRow label="Length" value={`${fs!.length} cm`} /> : null}
                {hasVal(fs?.breadth) ? <InfoRow label="Breadth" value={`${fs!.breadth} cm`} /> : null}
                {hasVal(fs?.gsm) ? <InfoRow label="GSM" value={`${fs!.gsm} GSM`} /> : null}
                {!hasVal(fs?.gsm) && !hasVal(fs?.weightValue) && hasVal(fs?.weight) ? (
                  <InfoRow label="Weight (GSM)" value={String(fs!.weight)} />
                ) : null}
                {hasVal(fs?.weave) ? <InfoRow label="Type of Weave" value={String(fs!.weave)} /> : null}
                {careInstructions.length > 0 ? (
                  <InfoRow label="Care Instructions">
                    <TagChips tags={careInstructions} />
                  </InfoRow>
                ) : null}
              </SectionCard>
            ) : null}

            {/* Dispatch & Shipping */}
            {(dt || product.weight) ? (
              <SectionCard icon={Truck} title="Dispatch & Shipping">
                {product.weight ? (
                  <InfoRow
                    label="Shipping Weight"
                    value={SUPPORTED_WEIGHT_UNITS.includes(product.weightUnit ?? '') ? `${product.weight} ${product.weightUnit}` : String(product.weight)}
                  />
                ) : null}
                {dt ? (
                  <>
                    <InfoRow label="Processing Days" value={`${dt.processingDays} day${dt.processingDays !== 1 ? 's' : ''}`} />
                    <InfoRow label="Shipping Days" value={`${dt.shippingDays} day${dt.shippingDays !== 1 ? 's' : ''}`} />
                    <InfoRow label="Total Days" value={`${dt.totalDays} day${dt.totalDays !== 1 ? 's' : ''}`} />
                  </>
                ) : null}
              </SectionCard>
            ) : null}

            {product.description ? (
              <SectionCard icon={FileText} title="Description">
                <Text className="text-sm text-slate-700" style={{ lineHeight: 20 }} selectable>{product.description}</Text>
              </SectionCard>
            ) : null}

            {product.rejectionReason ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <Text className="text-xs font-bold text-red-800 mb-1">Rejection Reason</Text>
                <Text className="text-sm text-red-700" style={{ lineHeight: 20 }} selectable>{product.rejectionReason}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Images & Variants */}
        {activeTab === 'images' ? (
          <View className="mx-4" style={{ rowGap: 14 }}>
            <SectionCard icon={ImageIcon} title={`Images (${images.length})`}>
              {images.length === 0 ? (
                <Text className="text-sm text-slate-500 py-4 text-center">No images uploaded.</Text>
              ) : (
                <View className="flex-row flex-wrap" style={{ columnGap: 8, rowGap: 8 }}>
                  {images.map((img: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setLightboxUri(img.url)}
                      className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
                    >
                      <Image source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      {img.isPrimary ? (
                        <View className="absolute top-1 left-1 bg-brand-500 rounded-full px-1.5 py-0.5">
                          <Text className="text-white text-[8px] font-bold">Primary</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </SectionCard>

            <SectionCard icon={Layers} title={`Variants (${variants.length})`}>
              {variants.length === 0 ? (
                <Text className="text-sm text-slate-500 py-4 text-center">No variants defined.</Text>
              ) : (
                <View style={{ rowGap: 12 }}>
                  {variants.map((vr: any) => {
                    const thumb = vr.images?.[0] || primaryImage;
                    return (
                      <TouchableOpacity
                        key={vr.id}
                        activeOpacity={thumb ? 0.85 : 1}
                        onPress={() => thumb && setLightboxUri(thumb)}
                        className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200"
                      >
                        <View className="flex-row" style={{ columnGap: 12 }}>
                          {/* Thumbnail */}
                          <View
                            className="w-16 h-16 rounded-xl bg-white overflow-hidden border border-slate-200 items-center justify-center"
                            style={{
                              shadowColor: '#0f172a',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.06,
                              shadowRadius: 4,
                              elevation: 2,
                            }}
                          >
                            {thumb ? (
                              <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                              <Package size={20} color="#cbd5e1" />
                            )}
                          </View>

                          {/* Details */}
                          <View className="flex-1 justify-center">
                            {/* Variant name */}
                            <Text className="text-sm font-bold text-slate-900 mb-1.5">
                              {vr.variantName?.trim() || '—'}
                            </Text>

                            {/* Color + Stock */}
                            <View className="flex-row items-center" style={{ columnGap: 10 }}>
                              {vr.color ? <ColorValue name={vr.color} hex={vr.colorHex} /> : null}
                              <View className="bg-brand-50 rounded-md px-1.5 py-0.5">
                                <Text className="text-[10px] font-bold text-brand-700">
                                  Stock: {vr.stock}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </SectionCard>
          </View>
        ) : null}

        {/* QC Activity */}
        {activeTab === 'activity' ? (
          <View className="mx-4" style={{ rowGap: 14 }}>
            {(() => {
              const status = product.approvalStatus;
              const isReinspection = status === 'REINSPECTION';
              const hasAction = Boolean(
                product.approvedAt || product.rejectionReason || product.qcInspectionData ||
                isReinspection || (product.inspectionCycleNumber && product.inspectionCycleNumber > 1),
              );
              const isRejected = status === 'REJECTED';
              const isApproved = status === 'QC_APPROVED' || status === 'APPROVED';
              const qcSummary = summariseQcData(product.qcInspectionData);
              const qc = product.assignedQc;

              if (!hasAction) {
                return (
                  <View className="items-center py-10">
                    <Clock size={28} color="#94a3b8" />
                    <Text className="text-sm text-slate-500 mt-2">No QC action recorded yet.</Text>
                  </View>
                );
              }

              return (
                <>
                  {/* Status banner */}
                  <View
                    className={`rounded-2xl p-4 border flex-row items-start ${
                      isRejected ? 'bg-red-50 border-red-200' : isApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {isRejected ? <XCircle size={20} color="#dc2626" /> : isApproved ? <CheckCircle size={20} color="#059669" /> : <Clock size={20} color="#64748b" />}
                    <View className="flex-1 ml-3">
                      <Text className={`text-sm font-bold ${isRejected ? 'text-red-800' : isApproved ? 'text-emerald-800' : 'text-slate-800'}`}>
                        Status: {status}
                      </Text>
                      {product.approvedAt ? (
                        <Text className="text-xs text-slate-600 mt-1">Decision recorded on {fmt(product.approvedAt)}</Text>
                      ) : null}
                      {isRejected && product.rejectionReason ? (
                        <Text className="text-sm text-red-700 mt-2">
                          <Text className="font-bold">Reason: </Text>{product.rejectionReason}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Re-inspection info */}
                  {isReinspection && product.inspectionCycleNumber > 1 ? (
                    <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <Text className="text-sm font-bold text-amber-800">
                        Re-Inspection Cycle #{product.inspectionCycleNumber}
                      </Text>
                      <Text className="text-xs text-amber-700 mt-1">
                        Previous inspection was rejected. Please re-evaluate this product thoroughly.
                      </Text>
                      {Array.isArray(product.previousInspectionData) && product.previousInspectionData.length > 0 ? (
                        <Text className="text-xs text-amber-600 mt-1">
                          Previous reason: {product.previousInspectionData[product.previousInspectionData.length - 1]?.rejectionReason || 'N/A'}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {qc ? (
                    <SectionCard icon={UserCheck} title="Assigned QC Checker">
                      <InfoRow label="Name" value={qc.name} />
                      <InfoRow label="Email" value={qc.email} />
                    </SectionCard>
                  ) : null}

                  {qcSummary.length > 0 ? (
                    <SectionCard icon={ClipboardList} title="Inspection Form Summary">
                      {qcSummary.map(({ key, value }) => (
                        <InfoRow key={key} label={humanize(key)} value={value} />
                      ))}
                    </SectionCard>
                  ) : null}

                  <SectionCard icon={Clock} title="Timeline">
                    <InfoRow label="Listed on" value={fmt(product.createdAt)} />
                    <InfoRow label="Last updated" value={fmt(product.updatedAt)} />
                  </SectionCard>
                </>
              );
            })()}
          </View>
        ) : null}
      </ScrollView>

      {/* Lightbox */}
      {lightboxUri ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setLightboxUri(null)}
            className="flex-1 bg-black items-center justify-center"
          >
            <TouchableOpacity
              onPress={() => setLightboxUri(null)}
              className="absolute top-12 right-4 w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
            <Image
              source={{ uri: lightboxUri }}
              style={{ width: '95%', height: '70%' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}

// ── Reusable ─────────────────────────────────────────────────────────────────

function Header({ onBack, insetsTop }: {
  onBack: () => void; insetsTop: number;
}) {
  return (
    <View className="bg-white border-b border-slate-100 flex-row items-center justify-between px-4 pb-3" style={{ paddingTop: insetsTop + 8 }}>
      <TouchableOpacity onPress={onBack} hitSlop={10} className="w-10 h-10 items-center justify-center rounded-full bg-slate-100">
        <ArrowLeft size={20} color="#0f172a" />
      </TouchableOpacity>
      <Text className="text-base font-bold text-slate-900">Product Details</Text>
      <View className="w-10" />
    </View>
  );
}

function InfoRow({ label, value, onPress, children }: { label: string; value?: string | null; onPress?: () => void; children?: React.ReactNode }) {
  if (!children && !value) return null;
  const Content = (
    <View className="py-2">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</Text>
      {children ? children : (
        <Text className="text-sm text-slate-900" style={{ lineHeight: 20 }} selectable={!onPress}>{value}</Text>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Content}</TouchableOpacity>;
  }
  return Content;
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '50%', marginBottom: 4 }}>
      <Text className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</Text>
      <Text className="text-base font-extrabold text-white">{value}</Text>
    </View>
  );
}

// Colour name + resolved swatch + hex code (e.g. ● red #ff0000), mirroring web.
function ColorValue({ name, hex }: { name?: string | null; hex?: string | null }) {
  const h = resolveHex(name, hex);
  return (
    <View className="flex-row items-center" style={{ columnGap: 6 }}>
      {h ? <View className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: h }} /> : null}
      <Text className="text-sm text-slate-900">{name}</Text>
      {h ? <Text className="text-xs font-mono uppercase text-slate-500">{h}</Text> : null}
    </View>
  );
}

function TagChips({ tags }: { tags: string[] }) {
  return (
    <View className="flex-row flex-wrap" style={{ columnGap: 6, rowGap: 6 }}>
      {tags.map((tag) => (
        <View key={tag} className="bg-slate-100 rounded-full px-2 py-0.5">
          <Text className="text-xs text-slate-700">{tag}</Text>
        </View>
      ))}
    </View>
  );
}
