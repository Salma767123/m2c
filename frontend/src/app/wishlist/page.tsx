import Header from '@/components/WebSite/Header/Header';
import Footer from '@/components/WebSite/Footer/Footer';
import Wishlist from '@/components/WebSite/Wishlist/Wishlist';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';

export default function WishlistPage() {
  const breadcrumbItems = [
    { label: 'Wishlist' }
  ];

  return (
    <div className="min-h-screen bg-[#f9f5f2]">
      <Header />
      <Breadcrumb items={breadcrumbItems} />
      <Wishlist />
      <Footer />
    </div>
  );
}
