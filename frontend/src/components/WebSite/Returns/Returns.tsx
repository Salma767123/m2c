import {
  RotateCcw,
  Clock,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  LifeBuoy,
} from 'lucide-react';
import LegalPage, {
  LegalList,
  LegalNote,
  LegalText,
  type LegalSection,
} from '@/components/WebSite/Shared/LegalPage';

/**
 * A step in "How to Return". Three of these, and they were three copies of the
 * same fourteen lines of markup differing only in a digit and two strings.
 */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e01a1b] text-[13px] font-semibold text-white">
        {n}
      </span>
      <div className="min-w-0 pt-1">
        <h3 className="text-[14.5px] font-semibold text-[#1a1a1a]">{title}</h3>
        <p className="mt-0.5 text-[14px] leading-relaxed text-[#5a524b]">{children}</p>
      </div>
    </div>
  );
}

/** One of the three refund facts. */
function Fact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#faf7f3] p-4 ring-1 ring-black/5">
      <h3 className="text-[13.5px] font-semibold text-[#1a1a1a]">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5a524b]">{children}</p>
    </div>
  );
}

/**
 * Every word is the original. What changed is the shell (see LegalPage) and
 * three things this page was doing on its own:
 *
 *  - Two `bg-blue-50 / border-blue-200 / text-blue-800` boxes, the only blue
 *    anywhere on this site. One of them even held red text inside a blue box.
 *  - Section headings at `text-gray-900` where Terms used `text-[#1a1a1a]`.
 *  - Green and grey section icons on two of six. The eligible/ineligible
 *    distinction now rests on the check and cross glyphs and on the headings,
 *    which is where it should rest anyway — colour alone is not something every
 *    reader can act on.
 */
const SECTIONS: LegalSection[] = [
  {
    id: 'return-policy',
    title: 'Return Policy',
    icon: <Clock />,
    body: (
      <>
        <LegalText className="mb-4">
          We want you to be completely satisfied with your purchase. If you&apos;re not happy
          with your order, you can return it within 30 days of delivery for a full refund.
        </LegalText>
        <LegalNote title="30-Day Return Window">
          Returns must be initiated within 30 days of delivery date
        </LegalNote>
      </>
    ),
  },
  {
    id: 'eligible-items',
    title: 'Eligible Items',
    icon: <CheckCircle />,
    body: (
      <LegalList>
        <li>Items in original condition with tags attached</li>
        <li>Unworn and unwashed clothing</li>
        <li>Electronics in original packaging</li>
        <li>Books in sellable condition</li>
        <li>Home goods without damage</li>
      </LegalList>
    ),
  },
  {
    id: 'non-returnable-items',
    title: 'Non-Returnable Items',
    icon: <XCircle />,
    body: (
      <LegalList>
        <li>Personalized or customized items</li>
        <li>Perishable goods</li>
        <li>Intimate apparel and swimwear</li>
        <li>Items damaged by misuse</li>
        <li>Digital downloads</li>
      </LegalList>
    ),
  },
  {
    id: 'how-to-return',
    title: 'How to Return',
    icon: <Package />,
    body: (
      <div className="space-y-4">
        <Step n={1} title="Start Your Return">
          Contact our customer service or use our online return portal
        </Step>
        <Step n={2} title="Package Your Items">
          Include all original packaging, tags, and accessories
        </Step>
        <Step n={3} title="Ship It Back">
          Use the prepaid return label we provide
        </Step>
      </div>
    ),
  },
  {
    id: 'refund-information',
    title: 'Refund Information',
    icon: <AlertCircle />,
    body: (
      // Three short, parallel facts. Stacked full width they read as a list
      // that lost its bullets; side by side they read as what they are.
      <div className="grid gap-3 sm:grid-cols-3">
        <Fact title="Processing Time">
          Refunds are processed within 5-7 business days after we receive your return
        </Fact>
        <Fact title="Refund Method">
          Refunds are issued to the original payment method used for purchase
        </Fact>
        <Fact title="Return Shipping">
          We provide free return shipping labels for all eligible returns
        </Fact>
      </div>
    ),
  },
  {
    id: 'need-help',
    title: 'Need Help?',
    icon: <LifeBuoy />,
    body: (
      <>
        <LegalText className="mb-4">
          Our customer service team is here to help with your return.
        </LegalText>
        <LegalNote>
          <p className="break-all">Email: returns@yourstore.com</p>
          <p>Phone: (555) 123-4567</p>
          <p>Hours: Monday-Friday, 9 AM - 6 PM EST</p>
        </LegalNote>
      </>
    ),
  },
];

const Returns = () => (
  <LegalPage
    icon={<RotateCcw />}
    eyebrow="Hassle-Free"
    title="Returns & Exchanges"
    meta="Easy returns within 30 days"
    sections={SECTIONS}
  />
);

export default Returns;
