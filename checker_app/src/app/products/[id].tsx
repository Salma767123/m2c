/**
 * Product detail — QC checker view.
 *
 * Mirrors the web checker portal (frontend/src/components/Checker/Products/ProductDetail.tsx):
 * header with status pill, scheduled-window banner, icon-row summary card, tab
 * bar (collapsed to QC Activity once the admin finalises), and the curated
 * QC Activity summary. No className here — precise inline styles avoid the
 * NativeWind className/style merge quirks on dynamic-colour elements.
 */
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
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Package,
  Factory,
  Mail,
  Phone,
  MapPin,
  Layers,
  Tag,
  FileText,
  RotateCw,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  X,
  Image as ImageIcon,
  ClipboardCheck,
  History,
  AlarmClockOff,
  CalendarClock,
  AlertCircle,
} from 'lucide-react-native';
import { formatDateDMY } from '@/components/Products/Steps/piShared';
import qcCheckerService from '../../services/qcCheckerService';
import { Button } from '@/components/UI';
import { brand, colors, elevation, fonts, radius, slate } from '@/constants/design';
import { isInspectionWindowElapsed, formatAssignmentWindow } from '@/lib/inspectionSchedule';
import { CareChip } from '@/components/Products/CareInstructions';
import { ManufacturerInfoCard, hasManufacturerInfo } from '@/components/Products/ManufacturerInfoCard';
import { useScrollNav, ScrollNavButton } from '@/components/General/ScrollNav';

type Tab = 'overview' | 'images' | 'activity';

const TABS: Tab[] = ['overview', 'images', 'activity'];

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  images: 'Images & Variants',
  activity: 'QC Activity',
};

// Mirrors web APPROVAL_COLOR (products have no UNDER_REVIEW status — vendor-only).
const APPROVAL_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  REINSPECTION: { bg: '#f5f3ff', text: '#7e22ce', border: '#ddd6fe' },
  QC_SUBMITTED: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  QC_APPROVED: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  APPROVED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  REJECTED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
};

const APPROVAL_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REINSPECTION: 'Reinspection',
  QC_SUBMITTED: 'Submitted',
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

// Stock breakdown for display. The backend keeps
//   product.totalStock = inventory.baseStock (non-variant pool) + sum(variant stocks)
// So the authoritative TOTAL is product.totalStock, and the base pool is
// recovered as total − variantSum.
const stockBreakdown = (product: any) => {
  const variants = product.variants || [];
  const total = product.totalStock ?? 0;
  const variantSum = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
  const baseStock = Math.max(0, total - variantSum);
  return { total, variantSum, baseStock, hasVariants: variants.length > 0 };
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

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return '—';
  }
};

type OpenLightbox = (uri: string, caption?: string) => void;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const scrollNav = useScrollNav();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ uri: string; caption?: string } | null>(null);

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

  // Reset the scroll-nav position when switching tabs (each tab has its own
  // content and the ScrollView stays mounted, so it starts wherever it was).
  React.useEffect(() => {
    scrollNav.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (loading && !product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={brand[500]} />
        <Text style={{ marginTop: 14, color: slate[600], fontSize: 13 }}>Loading product…</Text>
      </View>
    );
  }

  if ((error && !product) || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <HeaderBar insetsTop={insets.top} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <AlertCircle size={36} color="#dc2626" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: slate[900], marginBottom: 8, textAlign: 'center', fontFamily: fonts.bold }}>Something went wrong</Text>
          <Text style={{ fontSize: 15, color: slate[600], textAlign: 'center', marginBottom: 24 }}>{error || 'Product not found'}</Text>
          <Button label="Try Again" onPress={load} icon={RotateCw} variant="primary" />
        </View>
      </View>
    );
  }

  const status = product.approvalStatus;
  const sched = product.qcAssignment || {};
  const windowElapsed = isInspectionWindowElapsed(sched.scheduledDate, sched.scheduledTime, sched.estimatedDuration);
  const canStartInspection = ['PENDING', 'REINSPECTION'].includes(status) && !windowElapsed;

  // Once the admin has finalised the inspection (approved or rejected), the
  // checker's job on this product is done — collapse the view to QC Activity.
  const inspectionFinalised = ['APPROVED', 'REJECTED'].includes(status);
  const visibleTabs: Tab[] = inspectionFinalised ? ['activity'] : TABS;
  // Guard against a stale activeTab pointing at a now-hidden tab.
  const effectiveTab: Tab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0];

  const pill = APPROVAL_STYLE[status] || { bg: slate[100], text: slate[700], border: slate[200] };
  const statusLabel = APPROVAL_LABELS[status] || status;
  const primaryImage = product.images?.find((i: any) => i.isPrimary)?.url || product.images?.[0]?.url || null;
  const v = product.vendor || {};

  const openLightbox: OpenLightbox = (uri, caption) => setLightbox({ uri, caption });

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Header — back, product name + status pill, refresh */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: slate[200] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: slate[100], alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={slate[900]} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontFamily: fonts.bold, color: slate[900], lineHeight: 24 }} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <View style={{ borderWidth: 1, borderColor: pill.border, backgroundColor: pill.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: pill.text }}>{statusLabel}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={load} disabled={loading} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: slate[200], backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <RotateCw size={16} color={slate[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand[500]} colors={[brand[500]]} />
        }
        showsVerticalScrollIndicator={false}
        {...scrollNav.handlers}
      >
        {/* Centered content — caps width on tablets/landscape so rows don't stretch. */}
        <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        {/* Assigned inspection schedule (from the admin's QC assignment) */}
        {sched.scheduledDate ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 16, backgroundColor: windowElapsed ? '#fef2f2' : brand[50], borderColor: windowElapsed ? '#fecaca' : brand[100] }}>
            {windowElapsed ? <AlarmClockOff size={20} color="#dc2626" /> : <CalendarClock size={20} color={brand[500]} />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: windowElapsed ? '#b91c1c' : brand[600] }}>
                {windowElapsed ? 'Inspection Window Expired' : 'Scheduled Inspection Window'}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: slate[900], marginTop: 2 }}>
                {formatAssignmentWindow(sched.scheduledDate, sched.scheduledTime, sched.estimatedDuration)}
              </Text>
              {windowElapsed ? (
                <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
                  This inspection can no longer be started — please ask the admin to reschedule.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Summary Card */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,222,222,0.7)', backgroundColor: 'rgba(255,241,241,0.55)', padding: 20, marginBottom: 16 }}>
          <SummaryStat icon={ClipboardCheck} label="Inspection Status" value={statusLabel} />
          <SummaryStat icon={History} label="Inspection Cycle" value={`#${product.inspectionCycleNumber ?? 1}`} />
          <SummaryStat
            icon={CheckCircle}
            label="Last Inspected"
            value={fmt(
              product.lastReviewedAt
              || product.approvedAt
              || product.qcInspectionData?.inspectionStartedAt
              || null,
            )}
          />
          <SummaryStat icon={Clock} label="Assigned" value={fmt(product.createdAt)} />
        </View>

        {/* Start Inspection CTA / expired chip */}
        {canStartInspection ? (
          <View style={{ marginBottom: 16 }}>
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
        ) : ['PENDING', 'REINSPECTION'].includes(status) && windowElapsed ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
            <AlarmClockOff size={16} color="#dc2626" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#b91c1c' }}>Inspection Window Expired</Text>
          </View>
        ) : null}

        {/* Tabs + content */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: slate[200], overflow: 'hidden', ...elevation.card }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: slate[200] }}>
            {visibleTabs.map((tab) => {
              const active = effectiveTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingHorizontal: 8,
                    paddingVertical: 13,
                    borderBottomWidth: 2,
                    borderBottomColor: active ? brand[500] : 'transparent',
                    backgroundColor: active ? brand[50] : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: active ? '700' : '600', color: active ? brand[600] : slate[600] }}>
                    {TAB_LABELS[tab]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ padding: 16 }}>
            {effectiveTab === 'overview' && <OverviewTab product={product} primaryImage={primaryImage} onOpenLightbox={openLightbox} />}
            {effectiveTab === 'images' && <ImagesTab product={product} onOpenLightbox={openLightbox} />}
            {effectiveTab === 'activity' && <QcActivityTab product={product} />}
          </View>
        </View>
        </View>
      </ScrollView>

      <ScrollNavButton nav={scrollNav} bottom={insets.bottom + 16} />

      {/* Lightbox */}
      {lightbox ? (
        <Lightbox uri={lightbox.uri} caption={lightbox.caption} onClose={() => setLightbox(null)} />
      ) : null}
    </View>
  );
}

// ── Reusable ─────────────────────────────────────────────────────────────────

function HeaderBar({ onBack, insetsTop }: { onBack: () => void; insetsTop: number }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: slate[200], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, paddingTop: insetsTop + 8 }}>
      <TouchableOpacity onPress={onBack} hitSlop={10} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: slate[100] }}>
        <ArrowLeft size={20} color={slate[900]} />
      </TouchableOpacity>
      <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: slate[900] }}>Product Details</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; label: string; value: string }) {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  return (
    <View style={{ width: wide ? '25%' : '50%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingRight: 10 }}>
      <View style={{ padding: 8, borderRadius: 8, backgroundColor: brand[100], alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={brand[600]} strokeWidth={2.25} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: slate[500] }} numberOfLines={1}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: slate[900], marginTop: 1 }} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function Row({ icon: Icon, label, value, children }: { icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; label: string; value?: string | null; children?: React.ReactNode }) {
  if (!children && !value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 }}>
      <View style={{ marginTop: 2 }}>
        <Icon size={16} color={slate[400]} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, color: slate[500] }}>{label}</Text>
        {children ? children : <Text style={{ fontSize: 14, color: slate[900], lineHeight: 20, marginTop: 1 }}>{value || '—'}</Text>}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: slate[900], marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: slate[100] }}>{title}</Text>
      {children}
    </View>
  );
}

// Colour name + resolved swatch + hex code (e.g. ● red #ff0000).
function ColorValue({ name, hex }: { name?: string | null; hex?: string | null }) {
  const h = resolveHex(name, hex);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {h ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: h, borderWidth: 1, borderColor: '#cbd5e1' }} /> : null}
      {name ? <Text style={{ fontSize: 13, color: slate[900], flexShrink: 1 }} numberOfLines={1}>{name}</Text> : null}
      {h ? <Text style={{ fontSize: 10, fontFamily: fonts.regular, textTransform: 'uppercase', color: slate[500] }} numberOfLines={1}>{h}</Text> : null}
    </View>
  );
}

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// Compact stat tile for grid layouts (icon + label + value).
function StatTile({ icon: Icon, label, value, width }: { icon: LucideIcon; label: string; value: string; width: number }) {
  return (
    <View style={{ width, backgroundColor: slate[50], borderRadius: 12, padding: 14, borderWidth: 1, borderColor: slate[100], gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon size={14} color={slate[400]} strokeWidth={2} />
        <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: slate[400], flexShrink: 1 }} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: slate[900] }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function TagChips({ tags }: { tags: string[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {tags.map((tag) => (
        <View key={tag} style={{ backgroundColor: slate[100], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontSize: 12, color: slate[700] }}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ product, primaryImage, onOpenLightbox }: { product: any; primaryImage: string | null; onOpenLightbox: OpenLightbox }) {
  const v = product.vendor || {};
  const dt = product.dispatchTimeline;
  const fs = product.fabricSpecifications;
  const careInstructions: string[] = Array.isArray(fs?.careInstructions) ? fs.careInstructions : [];
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const imgSize = compact ? 80 : 96;
  const dsCols = width >= 720 ? 4 : 2;
  const dsGap = 10;
  const dsCardW = Math.min(width, 720) - 16 * 2 - 2 - 16 * 2; // screen pad + card border + card pad
  const dsTile = Math.floor((dsCardW - (dsCols - 1) * dsGap) / dsCols);

  return (
    <View>
      {/* The image gets its own row. Beside the fields it stole ~110px, so the
          Product section's labels, values and title underline all started
          further right than every section below it — nothing on the screen
          lined up. Stacked, every section shares one left edge and one width. */}
      <TouchableOpacity
        onPress={() => primaryImage && onOpenLightbox(primaryImage, product.name)}
        activeOpacity={primaryImage ? 0.85 : 1}
        style={{ width: imgSize, height: imgSize, borderRadius: 12, overflow: 'hidden', backgroundColor: slate[100], borderWidth: 1, borderColor: slate[200], alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}
      >
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Package size={32} color="#cbd5e1" />
        )}
      </TouchableOpacity>

      <Section title="Product">
        <Row icon={Package} label="Product Name" value={product.name} />
        <Row icon={Package} label="Category" value={product.category} />
        <Row icon={Package} label="Total Stock" value={String(product.totalStock ?? 0)} />
        {product.singleUnitColor ? (
          <Row icon={Package} label="Base Color">
            <ColorValue name={product.singleUnitColor} hex={product.singleUnitColorHex} />
          </Row>
        ) : null}
        {product.uom ? <Row icon={Package} label="Selling Unit (UOM)" value={uomLabel(product.uom)} /> : null}
        {product.description ? (
          <Row icon={FileText} label="Description">
            <Text style={{ fontSize: 13, color: slate[700], lineHeight: 20, marginTop: 1 }}>{product.description}</Text>
          </Row>
        ) : null}
        {Array.isArray(product.tags) && product.tags.length > 0 ? (
          <Row icon={Tag} label="Tags">
            <TagChips tags={product.tags} />
          </Row>
        ) : null}
      </Section>

      <Section title="Vendor">
        <Row icon={Factory} label="Company" value={v.companyName} />
        <Row icon={Factory} label="Owner" value={v.ownerName} />
        <Row icon={Mail} label="Primary Email" value={v.businessEmail || v.email} />
        {v.businessEmail2 ? <Row icon={Mail} label="Secondary Email" value={v.businessEmail2} /> : null}
        <Row icon={Phone} label="Primary Phone" value={v.businessPhone} />
        {v.phoneNumber2 ? <Row icon={Phone} label="Secondary Phone" value={v.phoneNumber2} /> : null}
        <Row
          icon={MapPin}
          label="Factory Location"
          value={[v.factoryAddress, v.factoryCity, v.factoryState, v.factoryZipCode, v.factoryCountry].filter(Boolean).join(', ')}
        />
      </Section>

      {/* Fabric & Specifications */}
      {(product.fabricType || product.material || fs) ? (
        <Section title="Fabric & Specifications">
          {product.fabricType ? <Row icon={Layers} label="Fabric Type" value={product.fabricType} /> : null}
          {product.material ? <Row icon={Layers} label="Material Description" value={product.material} /> : null}
          {hasVal(fs?.composition) ? <Row icon={Layers} label="Composition" value={String(fs.composition)} /> : null}
          {hasVal(fs?.weightValue) ? <Row icon={Layers} label="Weight" value={`${fs.weightValue} g`} /> : null}
          {hasVal(fs?.length) ? <Row icon={Layers} label="Length" value={`${fs.length} cm`} /> : null}
          {hasVal(fs?.breadth) ? <Row icon={Layers} label="Breadth" value={`${fs.breadth} cm`} /> : null}
          {hasVal(fs?.gsm) ? <Row icon={Layers} label="GSM" value={`${fs.gsm} GSM`} /> : null}
          {/* Legacy single weight (older products, pre-GSM fields). */}
          {!hasVal(fs?.gsm) && !hasVal(fs?.weightValue) && hasVal(fs?.weight) ? (
            <Row icon={Layers} label="Weight (GSM)" value={String(fs.weight)} />
          ) : null}
          {hasVal(fs?.weave) ? <Row icon={Layers} label="Type of Weave" value={String(fs.weave)} /> : null}
          {careInstructions.length > 0 ? (
            <View style={{ paddingVertical: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, color: slate[500], marginBottom: 8 }}>Care Instructions</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {careInstructions.map((inst: string, i: number) => (
                  <CareChip key={i} label={inst} />
                ))}
              </View>
            </View>
          ) : null}
        </Section>
      ) : null}

      {/* Manufacturer — who made the item */}
      {hasManufacturerInfo(product.manufacturerInfo) ? (
        <Section title="Manufacturer Information">
          <ManufacturerInfoCard info={product.manufacturerInfo} />
        </Section>
      ) : null}

      {/* Dispatch & Shipping */}
      {(dt || product.weight) ? (
        <Section title="Dispatch & Shipping">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: dsGap }}>
            {product.weight ? (
              <StatTile
                icon={Package}
                label="Shipping Weight"
                width={dsTile}
                value={SUPPORTED_WEIGHT_UNITS.includes(product.weightUnit ?? '') ? `${product.weight} ${product.weightUnit}` : String(product.weight)}
              />
            ) : null}
            {dt ? (
              <>
                <StatTile icon={Clock} label="Processing Days" width={dsTile} value={`${dt.processingDays} day${dt.processingDays !== 1 ? 's' : ''}`} />
                <StatTile icon={Clock} label="Shipping Days" width={dsTile} value={`${dt.shippingDays} day${dt.shippingDays !== 1 ? 's' : ''}`} />
                <StatTile icon={Clock} label="Total Days" width={dsTile} value={`${dt.totalDays} day${dt.totalDays !== 1 ? 's' : ''}`} />
              </>
            ) : null}
          </View>
        </Section>
      ) : null}

      {product.rejectionReason ? (
        <Section title="Rejection Reason">
          <Text style={{ fontSize: 13, color: '#b91c1c', lineHeight: 20, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12 }}>
            {product.rejectionReason}
          </Text>
        </Section>
      ) : null}
    </View>
  );
}

// ── Images & Variants ────────────────────────────────────────────────────────

function ImagesTab({ product, onOpenLightbox }: { product: any; onOpenLightbox: OpenLightbox }) {
  const { width } = useWindowDimensions();
  const images: any[] = product.images || [];
  const variants: any[] = product.variants || [];
  const primaryProductImage = images.find((i) => i.isPrimary)?.url || images[0]?.url || null;

  // Responsive image tiles: fit 3 across the available card width.
  const cols = width >= 720 ? 4 : 3;
  const tileGap = 10;
  const cardW = Math.min(width, 720) - 16 * 2 - 2 - 16 * 2; // screen pad + card border + card pad
  const tileSize = Math.floor((cardW - (cols - 1) * tileGap) / cols);

  // Fallback cascade for the variant thumbnail: variant's own first image →
  // product primary → placeholder.
  const variantThumb = (vv: any): string | null => vv.images?.[0] || primaryProductImage;

  return (
    <View>
      <Section title={`Images (${images.length})`}>
        {images.length === 0 ? (
          <Text style={{ fontSize: 13, color: slate[500] }}>No images uploaded.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tileGap }}>
            {images.map((img: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                onPress={() => onOpenLightbox(img.url, img.alt || `${product.name} — image ${idx + 1}`)}
                style={{ width: tileSize, height: tileSize, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: slate[200], backgroundColor: slate[100] }}
              >
                <Image source={{ uri: img.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                {img.isPrimary ? (
                  <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: brand[500], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: '#ffffff', fontSize: 8, fontWeight: '700' }}>Primary</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Section>

      <Section title="Base Product">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: slate[50], borderRadius: 12, padding: 14, borderWidth: 1, borderColor: slate[100] }}>
            <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: slate[400], marginBottom: 6 }}>Base Color</Text>
            {product.singleUnitColor ? (
              <ColorValue name={product.singleUnitColor} hex={product.singleUnitColorHex} />
            ) : (
              <Text style={{ fontSize: 13, color: slate[400] }}>Not specified</Text>
            )}
          </View>
          <View style={{ flex: 1, backgroundColor: slate[50], borderRadius: 12, padding: 14, borderWidth: 1, borderColor: slate[100] }}>
            <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: slate[400], marginBottom: 6 }}>Total Stock</Text>
            {(() => {
              const s = stockBreakdown(product);
              const uom = product.uom ? ` ${uomLabel(product.uom)}` : '';
              return (
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: slate[900] }}>
                    {s.total}{uom ? <Text style={{ fontWeight: '400', color: slate[500] }}>{uom}</Text> : null}
                  </Text>
                  {s.hasVariants ? (
                    <Text style={{ fontSize: 11, color: slate[500], marginTop: 2 }}>
                      {s.baseStock} base + {s.variantSum} across variants
                    </Text>
                  ) : null}
                </View>
              );
            })()}
          </View>
        </View>
      </Section>

      <Section title={`Variants (${variants.length})`}>
        {variants.length === 0 ? (
          <Text style={{ fontSize: 13, color: slate[500] }}>No variants defined.</Text>
        ) : (
          <View>
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: slate[50], paddingHorizontal: 12, paddingVertical: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
              <Text style={{ width: 44, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, color: slate[600] }}>Image</Text>
              <Text style={{ flex: 1, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, color: slate[600] }}>Variant</Text>
              <Text style={{ flex: 1, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, color: slate[600] }}>Color</Text>
              <Text style={{ width: 44, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, color: slate[600], textAlign: 'right' }}>Stock</Text>
            </View>
            {/* Rows */}
            {variants.map((vv: any) => {
              const thumb = variantThumb(vv);
              const caption = [vv.variantName, vv.color].filter(Boolean).join(' / ') || 'Variant';
              return (
                <View key={vv.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: slate[100] }}>
                  <View style={{ width: 44 }}>
                    {thumb ? (
                      <TouchableOpacity onPress={() => onOpenLightbox(thumb, caption)} style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: slate[200] }}>
                        <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: slate[200], backgroundColor: slate[50], alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={14} color="#cbd5e1" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: slate[700] }} numberOfLines={1}>{vv.variantName?.trim() || '—'}</Text>
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 6 }}>
                    <ColorValue name={vv.color} hex={vv.colorHex} />
                  </View>
                  <View style={{ width: 44, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: slate[900] }}>{vv.stock}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Section>
    </View>
  );
}

// ── QC Activity ──────────────────────────────────────────────────────────────

function QcActivityTab({ product }: { product: any }) {
  const status = product.approvalStatus;
  const isReinspection = status === 'REINSPECTION';
  const hasAction = Boolean(product.approvedAt || product.rejectionReason || product.qcInspectionData || isReinspection || (product.inspectionCycleNumber && product.inspectionCycleNumber > 1));
  const isRejected = status === 'REJECTED';
  const isApproved = status === 'QC_APPROVED' || status === 'APPROVED';
  const qc = product.assignedQc;

  // Curated inspection summary — same fields/order as web.
  const qcData = (product.qcInspectionData || {}) as Record<string, unknown>;
  const qcVal = (key: string): string => {
    const val = qcData[key];
    return val === null || val === undefined || val === '' ? '' : String(val);
  };
  // Mirrors web summariseQcData — only scalar (string/number/boolean) values count.
  const hasSummary = Object.entries(qcData).some(([, val]) => {
    if (val === null || val === undefined || val === '') return false;
    return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
  });
  const ven = product.vendor || {};
  const factoryAddressLines = [
    ven.factoryAddress,
    ven.warehouseAddressLine2,
    ven.warehouseAddressLine3,
    ven.warehouseLandmark,
    [ven.factoryCity, ven.factoryState, ven.factoryZipCode].filter(Boolean).join(', '),
    ven.factoryCountry,
  ]
    .map((l: unknown) => (l ?? '').toString().trim())
    .filter(Boolean);
  const summaryImage = (product.images || []).find((i: any) => i.isPrimary)?.url || (product.images || [])[0]?.url || null;
  const variantCount = (product.variants || []).length;

  if (!hasAction) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Clock size={28} color="#94a3b8" />
        <Text style={{ fontSize: 13, color: slate[500], marginTop: 8 }}>No QC action recorded for this product yet.</Text>
      </View>
    );
  }

  const bannerBg = isRejected ? '#fef2f2' : isApproved ? '#ecfdf5' : isReinspection ? '#fffbeb' : '#f8fafc';
  const bannerBorder = isRejected ? '#fecaca' : isApproved ? '#a7f3d0' : isReinspection ? '#fde68a' : slate[200];
  const bannerText = isRejected ? '#991b1b' : isApproved ? '#065f46' : isReinspection ? '#92400e' : slate[800];

  return (
    <View>
      {/* Status banner */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: bannerBorder, backgroundColor: bannerBg, padding: 16 }}>
        {isRejected ? (
          <XCircle size={20} color="#dc2626" />
        ) : isApproved ? (
          <CheckCircle size={20} color="#059669" />
        ) : isReinspection ? (
          <RotateCw size={20} color="#d97706" />
        ) : (
          <Clock size={20} color={slate[500]} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: bannerText }}>Current status: {status}</Text>
          {product.approvedAt ? (
            <Text style={{ fontSize: 12, color: slate[600], marginTop: 4 }}>Decision recorded on {fmt(product.approvedAt)}</Text>
          ) : null}
          {isRejected && product.rejectionReason ? (
            <Text style={{ fontSize: 13, color: '#b91c1c', marginTop: 8, lineHeight: 20 }}>
              <Text style={{ fontWeight: '700' }}>Reason: </Text>
              {product.rejectionReason}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Re-inspection info */}
      {isReinspection && product.inspectionCycleNumber && product.inspectionCycleNumber > 1 ? (
        <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 16, marginTop: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>
            Re-Inspection Cycle #{product.inspectionCycleNumber}
          </Text>
          <Text style={{ fontSize: 12, color: '#b45309', marginTop: 4 }}>
            Previous inspection was rejected. Please re-evaluate this product thoroughly.
          </Text>
          {Array.isArray(product.previousInspectionData) && product.previousInspectionData.length > 0 ? (
            <Text style={{ fontSize: 12, color: '#d97706', marginTop: 4 }}>
              Previous reason: {product.previousInspectionData[product.previousInspectionData.length - 1]?.rejectionReason || 'N/A'}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Assigned QC */}
      {qc ? (
        <Section title="Assigned QC Checker">
          <Row icon={UserCheck} label="Name" value={qc.name} />
          <Row icon={Mail} label="Email" value={qc.email} />
        </Section>
      ) : null}

      {/* Inspection form summary */}
      {hasSummary ? (
        <Section title="Inspection Form Summary">
          {/* Product — headline, full width */}
          <Row icon={Package} label="Product">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 1 }}>
              {summaryImage ? (
                <Image source={{ uri: summaryImage }} style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: slate[200] }} resizeMode="cover" />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: slate[200], backgroundColor: slate[50], alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={16} color="#cbd5e1" />
                </View>
              )}
              <Text style={{ fontSize: 14, fontWeight: '500', color: slate[900], flex: 1 }} numberOfLines={2}>{product.name}</Text>
            </View>
          </Row>

          <Row icon={Tag} label="Category" value={[product.category, product.subCategory].filter(Boolean).join(' › ')} />
          <Row icon={Factory} label="Vendor" value={qcVal('vendor') || ven.companyName} />

          <Row icon={MapPin} label="Factory Address">
            {factoryAddressLines.length > 0 ? (
              <View style={{ marginTop: 1 }}>
                {factoryAddressLines.map((line, i) => (
                  <Text key={i} style={{ fontSize: 14, color: slate[900], lineHeight: 20 }}>{line}</Text>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 14, color: slate[900], marginTop: 1 }}>—</Text>
            )}
          </Row>

          <Row icon={ClipboardCheck} label="Inspection Type" value={qcVal('serviceType')} />
          <Row icon={Layers} label="Variants" value={`${variantCount} variant${variantCount === 1 ? '' : 's'}`} />
          <Row icon={Clock} label="Inspection Start Date" value={formatDateDMY(qcVal('serviceStartDate'))} />
          <Row icon={Clock} label="Inspection Started At" value={fmtDateTime(qcVal('inspectionStartedAt'))} />
          <Row icon={CheckCircle} label="Final Decision" value={qcVal('finalDecision')} />
          <Row icon={ClipboardCheck} label="Inspection Status" value={qcVal('inspectionStatus')} />

          {qcVal('inspectorSignature') ? (
            <Row icon={UserCheck} label="Inspector Signature" value={qcVal('inspectorSignature')} />
          ) : null}
        </Section>
      ) : null}

      {/* Timestamps */}
      <Section title="Timeline">
        <Row icon={Clock} label="Listed on" value={fmtDateTime(product.createdAt)} />
        <Row icon={Clock} label="Last updated" value={fmtDateTime(product.updatedAt)} />
      </Section>
    </View>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ uri, caption, onClose }: { uri: string; caption?: string; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={{ position: 'absolute', top: 48, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Image source={{ uri }} style={{ width: width - 48, height: Math.max(200, height * 0.62) }} resizeMode="contain" />
          {caption ? (
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500', marginTop: 12, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' }} numberOfLines={2}>
              {caption}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
