'use client';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// The website breadcrumb strip was removed by request across all storefront pages.
// This component now renders nothing so every page's content/banner sits flush
// under the header with no leftover gap. Kept as a no-op (instead of editing each
// page) so the many `<Breadcrumb items={...}>` call sites stay valid.
const Breadcrumb = (_props: BreadcrumbProps) => null;

export default Breadcrumb;
