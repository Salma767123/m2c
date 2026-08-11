// RN port of VI_Step4_VendorType.tsx — Vendor Type & Products verification.

// import React, { useEffect } from 'react';
// import { View, Text } from 'react-native';
// import { Tags, Globe, Image as ImageIcon } from 'lucide-react-native';
// import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField';

// interface Props {
//   vendor: any;
//   verifications: Verifications;
//   onChange: (key: string, ok: boolean | null, remarks: string) => void;
//   onRegisterFields: (keys: string[]) => void;
// }

// export default function VI_Step4_VendorType({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
//   const vf = (key: string, label: string, value: any, type?: any) => (
//     <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
//   );

//   const capFirst = (s: any) => (typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s);
//   const vendorTypesDisplay = Array.isArray(v.vendorTypes) ? v.vendorTypes.map(capFirst) : v.vendorTypes;

//   const categoryPhotos: Array<{ label: string; url: string; catKey: string; idx: number }> = [];
//   if (v.categoryProducts && typeof v.categoryProducts === 'object') {
//     Object.entries(v.categoryProducts as Record<string, any[]>).forEach(([cat, products]) => {
//       (Array.isArray(products) ? products : []).forEach((p: any, pIdx: number) => {
//         (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
//           const url = ph?.url || ph?.preview;
//           if (url) categoryPhotos.push({ label: `${cat} · ${p?.name || `Product ${pIdx + 1}`}`, url, catKey: cat, idx: categoryPhotos.length });
//         });
//       });
//     });
//   }
//   if (Array.isArray(v.additionalCategories)) {
//     v.additionalCategories.forEach((cat: any) => {
//       (Array.isArray(cat?.products) ? cat.products : []).forEach((p: any, pIdx: number) => {
//         (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
//           const url = ph?.url || ph?.preview;
//           if (url) categoryPhotos.push({ label: `${cat?.name || 'Custom'} · ${p?.name || `Product ${pIdx + 1}`}`, url, catKey: cat?.name, idx: categoryPhotos.length });
//         });
//       });
//     });
//   }

//   useEffect(() => {
//     const keys: string[] = [
//       'vt_vendorTypes',
//       'vt_productCategories',
//       ...(v.categoryRemarks ? ['vt_categoryRemarks'] : []),
//       ...(v.primaryMarkets?.length > 0 ? ['vt_primaryMarkets'] : []),
//       ...categoryPhotos.map((_, idx) => `vt_catPhoto_${idx}`),
//     ];
//     onRegisterFields(keys);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [v]);

//   return (
//     <View style={{ rowGap: 28 }}>
//       <View className="border-b border-slate-200 pb-4">
//         <Text className="text-2xl font-bold text-slate-900 mb-1">Vendor Type & Products</Text>
//         <Text className="text-slate-500 text-sm">Verify vendor type, product categories, market focus, and quality control measures.</Text>
//       </View>

//       <SectionBlock title="Vendor Classification" icon={<Tags size={16} color="#e01a1b" />}>
//         <View style={{ rowGap: 16 }}>
//           {vf('vt_vendorTypes', 'Vendor Types', vendorTypesDisplay, 'list')}
//           {vf('vt_productCategories', 'Product Categories', v.productCategories, 'list')}
//           {v.categoryRemarks && vf('vt_categoryRemarks', 'General Remarks', v.categoryRemarks)}
//         </View>
//       </SectionBlock>

//       {v.primaryMarkets?.length > 0 && (
//         <SectionBlock title="Market Focus" icon={<Globe size={16} color="#e01a1b" />}>
//           <View style={{ rowGap: 16 }}>
//             {vf('vt_primaryMarkets', 'Market Focus', v.primaryMarkets.map(capFirst), 'list')}
//           </View>
//         </SectionBlock>
//       )}

//       {categoryPhotos.length > 0 && (
//         <SectionBlock title="Product Photos (by Category)" icon={<ImageIcon size={16} color="#e01a1b" />}>
//           <View style={{ rowGap: 16 }}>
//             {categoryPhotos.map((photo) => (
//               <VerifyField
//                 key={photo.idx}
//                 fieldKey={`vt_catPhoto_${photo.idx}`}
//                 label={photo.label}
//                 value={photo.url}
//                 type="image"
//                 verifications={verifications}
//                 onChange={onChange}
//               />
//             ))}
//           </View>
//         </SectionBlock>
//       )}

//     </View>
//   );
// }


// RN port of VI_Step4_VendorType.tsx — Vendor Type & Products verification.

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Tags, Globe, Image as ImageIcon } from 'lucide-react-native';
import VerifyField, { SectionBlock, Verifications, ListTone } from './VI_VerifyField';

interface Props {
  vendor: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  onRegisterFields: (keys: string[]) => void;
}

export default function VI_Step4_VendorType({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  // listTone tints the chips for a list value. All three classification lists
  // use the brand red; plain text fields pass nothing and stay as-is.
  const vf = (key: string, label: string, value: any, type?: any, listTone?: ListTone) => (
    <VerifyField
      key={key}
      fieldKey={key}
      label={label}
      value={value}
      type={type}
      listTone={listTone}
      verifications={verifications}
      onChange={onChange}
    />
  );

  const capFirst = (s: any) => (typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const vendorTypesDisplay = Array.isArray(v.vendorTypes) ? v.vendorTypes.map(capFirst) : v.vendorTypes;

  const categoryPhotos: Array<{ label: string; url: string; catKey: string; idx: number }> = [];
  if (v.categoryProducts && typeof v.categoryProducts === 'object') {
    Object.entries(v.categoryProducts as Record<string, any[]>).forEach(([cat, products]) => {
      (Array.isArray(products) ? products : []).forEach((p: any, pIdx: number) => {
        (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview;
          if (url) categoryPhotos.push({ label: `${cat} · ${p?.name || `Product ${pIdx + 1}`}`, url, catKey: cat, idx: categoryPhotos.length });
        });
      });
    });
  }
  if (Array.isArray(v.additionalCategories)) {
    v.additionalCategories.forEach((cat: any) => {
      (Array.isArray(cat?.products) ? cat.products : []).forEach((p: any, pIdx: number) => {
        (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview;
          if (url) categoryPhotos.push({ label: `${cat?.name || 'Custom'} · ${p?.name || `Product ${pIdx + 1}`}`, url, catKey: cat?.name, idx: categoryPhotos.length });
        });
      });
    });
  }

  useEffect(() => {
    const keys: string[] = [
      'vt_vendorTypes',
      'vt_productCategories',
      ...(v.categoryRemarks ? ['vt_categoryRemarks'] : []),
      ...(v.primaryMarkets?.length > 0 ? ['vt_primaryMarkets'] : []),
      ...categoryPhotos.map((_, idx) => `vt_catPhoto_${idx}`),
    ];
    onRegisterFields(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Vendor Type & Products</Text>
        <Text className="text-slate-500 text-sm">Verify vendor type, product categories, market focus, and quality control measures.</Text>
      </View>

      <SectionBlock title="Vendor Classification" icon={<Tags size={16} color="#e01a1b" />}>
        <View style={{ rowGap: 16 }}>
          {vf('vt_vendorTypes', 'Vendor Types', vendorTypesDisplay, 'list', 'brand')}
          {vf('vt_productCategories', 'Product Categories', v.productCategories, 'list', 'brand')}
          {v.categoryRemarks && vf('vt_categoryRemarks', 'General Remarks', v.categoryRemarks)}
        </View>
      </SectionBlock>

      {v.primaryMarkets?.length > 0 && (
        <SectionBlock title="Market Focus" icon={<Globe size={16} color="#e01a1b" />}>
          <View style={{ rowGap: 16 }}>
            {vf('vt_primaryMarkets', 'Market Focus', v.primaryMarkets.map(capFirst), 'list', 'brand')}
          </View>
        </SectionBlock>
      )}

      {categoryPhotos.length > 0 && (
        <SectionBlock title="Product Photos (by Category)" icon={<ImageIcon size={16} color="#e01a1b" />}>
          <View style={{ rowGap: 16 }}>
            {categoryPhotos.map((photo) => (
              <VerifyField
                key={photo.idx}
                fieldKey={`vt_catPhoto_${photo.idx}`}
                label={photo.label}
                value={photo.url}
                type="image"
                verifications={verifications}
                onChange={onChange}
              />
            ))}
          </View>
        </SectionBlock>
      )}

    </View>
  );
}