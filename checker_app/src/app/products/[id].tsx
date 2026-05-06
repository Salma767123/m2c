import React, { useCallback, useEffect, useState } from 'react';
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
  Mail,
  Phone,
  MapPin,
  Layers,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react-native';
import qcCheckerService, { AuditLogEntry } from '../../services/qcCheckerService';
import AuditTimeline from '../../components/General/AuditTimeline';

type Tab = 'overview' | 'images' | 'activity';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'images', label: 'Images' },
  { id: 'activity', label: 'QC Activity' },
];

const APPROVAL_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  REINSPECTION: { bg: '#ffedd5', text: '#9a3412' },
  UNDER_ADMIN_REVIEW: { bg: '#fef3c7', text: '#92400e' },
  QC_APPROVED: { bg: '#d1fae5', text: '#065f46' },
  APPROVED: { bg: '#d1fae5', text: '#065f46' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
};

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const fmtPrice = (v?: number | null) => {
  if (v === null || v === undefined) return '—';
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

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

  useEffect(() => {
    load();
    if (id) {
      qcCheckerService.getAuditTrail('PRODUCT_INSPECTION', id)
        .then(res => setAuditLogs(res.logs || []))
        .catch(() => {});
    }
  }, [id]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  if (loading && !product) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
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
          <TouchableOpacity onPress={load} className="flex-row items-center bg-blue-600 rounded-xl px-6 py-3">
            <RefreshCw size={18} color="#ffffff" />
            <Text className="text-white font-bold ml-2">Try Again</Text>
          </TouchableOpacity>
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

  return (
    <View className="flex-1 bg-slate-50">
      <Header onBack={() => router.back()} insetsTop={insets.top} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />
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
                {product.approvalStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary card */}
        <View className="mx-4 mt-4 rounded-2xl p-5" style={{ backgroundColor: '#2563eb' }}>
          <View className="flex-row flex-wrap" style={{ rowGap: 14, columnGap: 0 }}>
            <SummaryStat label="Base Price" value={fmtPrice(product.basePrice)} />
            <SummaryStat label="Total Stock" value={String(product.totalStock ?? 0)} />
            <SummaryStat label="Variants" value={String(variants.length)} />
            <SummaryStat label="Listed" value={fmt(product.createdAt)} />
          </View>
        </View>

        {/* Start Inspection CTA */}
        {canInspect ? (
          <View className="mx-4 mt-3">
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/product-inspection' as any,
                params: { productId: id, productName: product.name, vendorName: v.companyName || '' },
              })}
              activeOpacity={0.85}
              className="flex-row items-center justify-center bg-blue-600 rounded-xl py-3"
            >
              <FileText size={16} color="#ffffff" />
              <Text className="text-white font-bold text-sm ml-2">Start Inspection</Text>
            </TouchableOpacity>
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
                className={`mx-1 px-4 py-2 rounded-full ${isActive ? 'bg-slate-900' : 'bg-white border border-slate-200'}`}
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

            <Card title="Product">
              <InfoRow label="Category" value={product.category} />
              <InfoRow label="Sub-category" value={product.subCategory} />
              <InfoRow label="Base Price" value={fmtPrice(product.basePrice)} />
              <InfoRow label="Total Stock" value={String(product.totalStock ?? 0)} />
            </Card>

            <Card title="Vendor">
              <InfoRow label="Company" value={v.companyName} />
              <InfoRow label="Owner" value={v.ownerName} />
              <InfoRow label="Email" value={v.businessEmail || v.email} onPress={() => {}} />
              <InfoRow label="Phone" value={v.businessPhone} />
              <InfoRow label="Factory" value={[v.factoryCity, v.factoryState].filter(Boolean).join(', ')} />
            </Card>

            {product.description ? (
              <Card title="Description">
                <Text className="text-sm text-slate-700" style={{ lineHeight: 20 }} selectable>{product.description}</Text>
              </Card>
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
            <Card title={`Images (${images.length})`}>
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
                        <View className="absolute top-1 left-1 bg-blue-600 rounded-full px-1.5 py-0.5">
                          <Text className="text-white text-[8px] font-bold">Primary</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>

            <Card title={`Variants (${variants.length})`}>
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
                            {/* Size + Color row */}
                            <View className="flex-row items-center mb-1.5" style={{ columnGap: 8 }}>
                              {vr.size ? (
                                <View className="bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                                  <Text className="text-xs font-bold text-slate-900">{vr.size}</Text>
                                </View>
                              ) : null}
                              {vr.color ? (
                                <View className="flex-row items-center bg-white border border-slate-200 rounded-lg px-2 py-0.5" style={{ columnGap: 4 }}>
                                  {vr.colorHex ? (
                                    <View
                                      className="w-3 h-3 rounded-full border border-slate-300"
                                      style={{ backgroundColor: vr.colorHex }}
                                    />
                                  ) : null}
                                  <Text className="text-xs font-bold text-slate-900">{vr.color}</Text>
                                </View>
                              ) : null}
                            </View>

                            {/* SKU */}
                            <Text className="text-[11px] font-mono text-slate-500 mb-1">
                              {vr.sku}
                            </Text>

                            {/* Price + Stock */}
                            <View className="flex-row items-center" style={{ columnGap: 10 }}>
                              <Text className="text-sm font-extrabold text-slate-900">
                                {fmtPrice(vr.price)}
                              </Text>
                              <View className="bg-blue-50 rounded-md px-1.5 py-0.5">
                                <Text className="text-[10px] font-bold text-blue-700">
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
            </Card>
          </View>
        ) : null}

        {/* QC Activity */}
        {activeTab === 'activity' ? (
          <View className="mx-4" style={{ rowGap: 14 }}>
            {(() => {
              const status = product.approvalStatus;
              const hasAction = Boolean(product.approvedAt || product.rejectionReason || product.qcInspectionData);
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
                        <Text className="text-xs text-slate-600 mt-1">Decided on {fmt(product.approvedAt)}</Text>
                      ) : null}
                      {isRejected && product.rejectionReason ? (
                        <Text className="text-sm text-red-700 mt-2">
                          <Text className="font-bold">Reason: </Text>{product.rejectionReason}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {qc ? (
                    <Card title="Assigned QC Checker">
                      <InfoRow label="Name" value={qc.name} />
                      <InfoRow label="Email" value={qc.email} />
                    </Card>
                  ) : null}

                  {qcSummary.length > 0 ? (
                    <Card title="Inspection Form Summary">
                      {qcSummary.map(({ key, value }) => (
                        <InfoRow key={key} label={humanize(key)} value={value} />
                      ))}
                    </Card>
                  ) : null}

                  <Card title="Timeline">
                    <InfoRow label="Listed on" value={fmt(product.createdAt)} />
                    <InfoRow label="Last updated" value={fmt(product.updatedAt)} />
                    {product.inspectionCycleNumber > 1 && (
                      <InfoRow label="Inspection Cycle" value={`#${product.inspectionCycleNumber}`} />
                    )}
                  </Card>

                  {/* Audit Trail */}
                  {auditLogs.length > 0 && (
                    <View className="bg-white rounded-2xl border border-slate-200 p-4">
                      <View className="flex-row items-center mb-3">
                        <Clock size={16} color="#475569" />
                        <Text className="text-sm font-bold text-slate-900 ml-2">Audit Trail</Text>
                      </View>
                      <AuditTimeline logs={auditLogs} />
                    </View>
                  )}
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4">
      <Text className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, onPress }: { label: string; value?: string | null; onPress?: () => void }) {
  if (!value) return null;
  const Content = (
    <View className="py-2">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</Text>
      <Text className="text-sm text-slate-900" style={{ lineHeight: 20 }} selectable={!onPress}>{value}</Text>
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
      <Text className="text-[10px] text-blue-200 uppercase tracking-wider font-bold mb-0.5">{label}</Text>
      <Text className="text-base font-extrabold text-white">{value}</Text>
    </View>
  );
}
