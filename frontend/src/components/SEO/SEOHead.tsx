import { useEffect } from 'react';
import { useSEO, applySEO } from '@/hooks/useSEO';

interface SEOHeadProps {
    pageName: string;
    defaultTitle?: string;
    defaultDescription?: string;
}

export default function SEOHead({ pageName, defaultTitle, defaultDescription }: SEOHeadProps) {
    const { seoData, loading } = useSEO(pageName);

    useEffect(() => {
        if (!loading) {
            applySEO(seoData, defaultTitle);
        }
    }, [seoData, loading, defaultTitle]);

    return null; // This component doesn't render anything
}
