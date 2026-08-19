import { FileText, Scale, AlertTriangle, CreditCard, Truck, RefreshCw } from 'lucide-react';
import LegalPage, {
  LegalList,
  LegalText,
  type LegalSection,
} from '@/components/WebSite/Shared/LegalPage';

/**
 * The sections, in order. Every word is the original — this page was rebuilt
 * around the copy, not with it.
 *
 * Declared as data rather than markup because the contents rail needs the
 * titles, and a list that both the navigation and the document are generated
 * from cannot fall out of step with itself.
 */
const SECTIONS: LegalSection[] = [
  {
    id: 'acceptance-of-terms',
    title: 'Acceptance of Terms',
    icon: <FileText />,
    body: (
      <LegalText>
        By accessing and using this website, you accept and agree to be bound by the terms
        and provision of this agreement. If you do not agree to abide by the above, please
        do not use this service.
      </LegalText>
    ),
  },
  {
    id: 'payment-terms',
    title: 'Payment Terms',
    icon: <CreditCard />,
    body: (
      <LegalList>
        <li>All prices are listed in USD and are subject to change without notice</li>
        <li>Payment is due at the time of purchase</li>
        <li>We accept major credit cards and PayPal</li>
        <li>All transactions are processed securely</li>
      </LegalList>
    ),
  },
  {
    id: 'shipping-and-delivery',
    title: 'Shipping and Delivery',
    icon: <Truck />,
    body: (
      <LegalList>
        <li>We ship to addresses within the United States</li>
        <li>Delivery times vary by location and shipping method selected</li>
        <li>Risk of loss passes to you upon delivery to the carrier</li>
        <li>We are not responsible for delays caused by shipping carriers</li>
      </LegalList>
    ),
  },
  {
    id: 'returns-and-refunds',
    title: 'Returns and Refunds',
    icon: <RefreshCw />,
    body: (
      <LegalText>
        Please refer to our Returns Policy for detailed information about returns,
        exchanges, and refunds.
      </LegalText>
    ),
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    icon: <AlertTriangle />,
    body: (
      <LegalText>
        In no event shall our company be liable for any direct, indirect, punitive,
        incidental, special, consequential damages or any damages whatsoever including,
        without limitation, damages for loss of use, data or profits, arising out of or
        in any way connected with the use or performance of the website.
      </LegalText>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    icon: <Scale />,
    body: (
      <LegalText>
        These terms and conditions are governed by and construed in accordance with the
        laws of the United States and you irrevocably submit to the exclusive jurisdiction
        of the courts in that State or location.
      </LegalText>
    ),
  },
];

const Terms = () => (
  <LegalPage
    icon={<Scale />}
    eyebrow="Our Agreement"
    title="Terms of Service"
    meta="Last updated: December 2024"
    sections={SECTIONS}
  />
);

export default Terms;
