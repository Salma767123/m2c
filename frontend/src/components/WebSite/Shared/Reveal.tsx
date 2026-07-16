'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Extra classes applied to the wrapper (layout classes belong here). */
  className?: string;
  /** Stagger delay in milliseconds before the element animates in. */
  delay?: number;
  /** Render a different element than a div (e.g. 'li', 'section'). */
  as?: ElementType;
  /** Only animate the first time the element enters the viewport. */
  once?: boolean;
}

/**
 * Scroll-reveal wrapper. Adds the `.reveal` utility (hidden state) and flips
 * it to `.is-visible` once the element scrolls into view. Content is always
 * in the DOM for SEO; if IntersectionObserver is unavailable it reveals
 * immediately so nothing is ever stuck hidden.
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(node);

    // Fail-safe: never let content stay hidden. If the observer hasn't
    // fired within 1.4s (e.g. it mounted already in-view after an async
    // data fetch, or a browser quirk), reveal anyway.
    const failSafe = setTimeout(() => setVisible(true), 1400);

    return () => {
      observer.disconnect();
      clearTimeout(failSafe);
    };
  }, [once]);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
