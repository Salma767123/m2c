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
  const [doc, setDoc] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    docViewerBus.register((url, name) => setDoc({ url, name }))
    return () => docViewerBus.unregister()
  }, [])

  if (!doc) return null
  return (
    <DocViewerModal
      url={doc.url}
      name={doc.name}
      onClose={() => setDoc(null)}
    />
  )
}
