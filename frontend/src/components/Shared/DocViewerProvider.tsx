'use client'

import { useState, useEffect } from 'react'
import { docViewerBus } from '@/lib/docViewerBus'
import DocViewerModal from '@/components/UI/DocViewerModal'

/**
 * Mount once in the root layout.
 * Registers itself with docViewerBus so any openDoc() call from anywhere
 * in the app opens the in-app viewer instead of a new browser tab.
 */
export default function DocViewerProvider() {
  const [doc, setDoc] = useState<{ url: string; name: string; readOnly?: boolean } | null>(null)

  useEffect(() => {
    docViewerBus.register((url, name, readOnly) => setDoc({ url, name, readOnly }))
    return () => docViewerBus.unregister()
  }, [])

  if (!doc) return null
  return (
    <DocViewerModal
      url={doc.url}
      name={doc.name}
      readOnly={doc.readOnly}
      onClose={() => setDoc(null)}
    />
  )
}
