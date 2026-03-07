'use client'

import Categories from '@/components/WebSite/Categories/Categories';
import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';
import SEOHead from '@/components/SEO/SEOHead';

export default function CategoriesPage() {
  const breadcrumbItems = [
    { label: 'Categories' }
  ];

  return (
    <>
      <SEOHead 
        pageName="categories" 
        defaultTitle="Categories - M2C Marketplace"
        defaultDescription="Browse our wide range of product categories on M2C Marketplace"
      />
      <Header />
      <Breadcrumb items={breadcrumbItems} />
      <Categories />
      <Footer />
    </>
  );
}
