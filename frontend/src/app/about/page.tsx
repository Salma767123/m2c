'use client'

import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import About from '@/components/WebSite/About/About';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';
import SEOHead from '@/components/SEO/SEOHead';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead 
        pageName="about" 
        defaultTitle="About Us - M2C Marketplace"
        defaultDescription="Learn more about M2C Marketplace and our mission to connect businesses"
      />
      <Header />
      <Breadcrumb items={[{ label: 'About Us' }]} />
      <About />
      <Footer />
    </div>
  );
}
