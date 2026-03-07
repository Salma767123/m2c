import { useEffect, useState } from 'react';
import axios from '@/lib/axios';

interface SEOData {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
}

export function useSEO(pageName: string) {
    const [seoData, setSeoData] = useState<SEOData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSEO = async () => {
            try {
                const response = await axios.get(`/seo-settings/public/${pageName}`);
                if (response.data.success) {
                    setSeoData(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch SEO settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSEO();
    }, [pageName]);

    return { seoData, loading };
}

export function applySEO(seoData: SEOData | null, defaultTitle?: string) {
    if (typeof window === 'undefined') return;

    // Update title
    if (seoData?.metaTitle) {
        document.title = seoData.metaTitle;
    } else if (defaultTitle) {
        document.title = defaultTitle;
    }

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string | undefined, property?: boolean) => {
        if (!content) return;

        const attribute = property ? 'property' : 'name';
        let element = document.querySelector(`meta[${attribute}="${name}"]`);
        
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attribute, name);
            document.head.appendChild(element);
        }
        
        element.setAttribute('content', content);
    };

    // Meta description
    updateMetaTag('description', seoData?.metaDescription);

    // Meta keywords
    updateMetaTag('keywords', seoData?.metaKeywords);

    // Open Graph tags
    updateMetaTag('og:title', seoData?.metaTitle || defaultTitle, true);
    updateMetaTag('og:description', seoData?.metaDescription, true);
    updateMetaTag('og:image', seoData?.ogImage, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:url', window.location.href, true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', seoData?.metaTitle || defaultTitle);
    updateMetaTag('twitter:description', seoData?.metaDescription);
    updateMetaTag('twitter:image', seoData?.ogImage);
}
