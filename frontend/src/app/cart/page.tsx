import Header from '@/components/WebSite/Header/Header';
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb';
import Footer from '@/components/WebSite/Footer/Footer';
import Cart from '@/components/WebSite/Cart/Cart';

export default function CartPage() {
  const breadcrumbItems = [
    { label: 'Cart' }
  ];
  // Warm ground, matching the cart itself. This wrapper was on the cool
  // bg-gray-50 while Cart.tsx paints #f7f7f5, so the two disagreed wherever the
  // wrapper showed — behind the breadcrumb, and in any gap the cart did not
  // cover. A JS comment, not a JSX one: `return (` wants an expression, and
  // {/* ... */} there is a syntax error rather than a comment.
  return (
    <div className="min-h-screen bg-[#f9f5f2]">
      <Header />
      <Breadcrumb items={breadcrumbItems} />
      <Cart />
      <Footer />
    </div>
  );
}
