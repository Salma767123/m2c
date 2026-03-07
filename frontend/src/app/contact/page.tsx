'use client'

import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import Contact from '@/components/WebSite/Contact/Contact';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';
import SEOHead from '@/components/SEO/SEOHead';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead 
        pageName="contact" 
        defaultTitle="Contact Us - M2C Marketplace"
        defaultDescription="Get in touch with M2C Marketplace. We're here to help with your B2B needs"
      />
      <Header />
      <Breadcrumb items={[{ label: 'Contact' }]} />
      <Contact />
      <Footer />
    </div>
  );
};

export default ContactPage;
