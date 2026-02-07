'use client';

import { use } from 'react';
import SubCategories from '@/components/WebSite/SubCategories/SubCategories';
import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';

interface SubCategoriesPageProps {
  params: Promise<{
    id: string
  }>
}

export default function SubCategoriesPage({ params }: SubCategoriesPageProps) {
  const { id } = use(params);

  const breadcrumbItems = [
    { label: 'Categories', href: '/categories' },
    { label: `Category ${id}` }
  ];

  return (
    <>
      <Header />
      <Breadcrumb items={breadcrumbItems} />
      <SubCategories categorySlug={id} />
      <Footer />
    </>
  );
}
