import { Shield, Eye, Lock, Users, Mail } from 'lucide-react';
import LegalPage, {
  LegalList,
  LegalNote,
  LegalText,
  type LegalSection,
} from '@/components/WebSite/Shared/LegalPage';

/**
 * Every word here is the original. The page moved onto the shared policy shell
 * — see LegalPage — which is also where it picks up the contents rail, the
 * reading measure and the print stylesheet.
 *
 * One thing this page was doing alone: it sat at `max-w-[95%]` while Terms and
 * Returns sat at `max-w-7xl`, so the three were already three widths.
 */
const SECTIONS: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    icon: <Eye />,
    body: (
      <>
        <LegalText className="mb-4">
          We collect information you provide directly to us, such as when you create an account,
          make a purchase, or contact us for support.
        </LegalText>
        <LegalList>
          <li>Personal information (name, email, phone number)</li>
          <li>Payment information (processed securely through third-party providers)</li>
          <li>Shipping and billing addresses</li>
          <li>Purchase history and preferences</li>
        </LegalList>
      </>
    ),
  },
  {
    id: 'how-we-use-your-information',
    title: 'How We Use Your Information',
    icon: <Lock />,
    body: (
      <LegalList>
        <li>Process and fulfill your orders</li>
        <li>Communicate with you about your purchases</li>
        <li>Provide customer support</li>
        <li>Send promotional emails (with your consent)</li>
        <li>Improve our services and user experience</li>
      </LegalList>
    ),
  },
  {
    id: 'information-sharing',
    title: 'Information Sharing',
    icon: <Users />,
    body: (
      <>
        <LegalText className="mb-4">
          We do not sell, trade, or rent your personal information to third parties. We may share
          your information only in the following circumstances:
        </LegalText>
        <LegalList>
          <li>With service providers who help us operate our business</li>
          <li>When required by law or to protect our rights</li>
          <li>In connection with a business transfer or merger</li>
        </LegalList>
      </>
    ),
  },
  {
    id: 'contact-us',
    title: 'Contact Us',
    icon: <Mail />,
    body: (
      <>
        <LegalText>
          If you have any questions about this Privacy Policy, please contact us at:
        </LegalText>
        {/* The same red-ruled panel this page already used, now the shared
            callout so Returns' blue box and this one stop being two answers to
            one question. The addresses are untouched. */}
        <LegalNote className="mt-4">
          <p>Email: privacy@yourstore.com</p>
          <p>Phone: (555) 123-4567</p>
        </LegalNote>
      </>
    ),
  },
];

function Privacy() {
  return (
    <LegalPage
      icon={<Shield />}
      eyebrow="Your Privacy"
      title="Privacy Policy"
      meta="Last updated: December 2024"
      sections={SECTIONS}
    />
  );
}

export default Privacy;
