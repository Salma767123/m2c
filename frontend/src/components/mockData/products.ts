export interface Product {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number; // Discount percentage (e.g., 25 for 25% off)
  category: string;
  images: string[];
  inStock: boolean;
  rating: number;
  reviews: number;
  tags: string[];
  material: string;
  dimensions?: string;
  weight?: string;
  careInstructions: string[];
}

export const products: Product[] = [
  {
    id: "1",
    name: "Handwoven Cotton Kitchen Towel Set",
    description: "Traditional handwoven cotton kitchen towels made with time-honored techniques passed down through generations. Highly absorbent and durable.",
    price: 25.99,
    originalPrice: 32.99,
    discount: 21, // 21% off
    category: "Kitchen Towels",
    images: [
      "/assets/images/features/products/fp1.jpg",
      "/assets/images/features/products/tb1.jpg",
      "/assets/images/features/products/tb2.jpg",
      "/assets/images/features/products/tb3.jpg"
    ],
    inStock: true,
    rating: 4.8,
    reviews: 127,
    tags: ["handmade", "cotton", "traditional", "eco-friendly"],
    material: "100% Organic Cotton",
    dimensions: "16\" x 24\"",
    weight: "150g per towel",
    careInstructions: ["Machine wash cold", "Tumble dry low", "Iron if needed"]
  },
  {
    id: "2",
    name: "Artisan Linen Apron",
    description: "Beautifully crafted linen apron with traditional embroidery. Perfect for cooking and crafting, made by skilled artisans using ancestral methods.",
    price: 45.00,
    originalPrice: 60.00,
    discount: 25, // 25% off
    category: "Aprons",
    images: [
      "/assets/images/features/products/fp5.jpg",
      "/assets/images/features/products/ap1.jpg",
      "/assets/images/features/products/ap2.jpg",
      "/assets/images/features/products/ap3.jpg"
    ],
    inStock: true,
    rating: 4.9,
    reviews: 89,
    tags: ["linen", "embroidered", "artisan", "traditional"],
    material: "Pure Linen with Cotton Embroidery",
    dimensions: "32\" x 28\"",
    careInstructions: ["Hand wash recommended", "Air dry", "Iron on medium heat"]
  },
  {
    id: "3",
    name: "Bamboo Fiber Hand Towel",
    description: "Soft and sustainable bamboo fiber hand towels. Made using traditional weaving techniques with modern eco-friendly materials.",
    price: 18.50,
    originalPrice: 24.00,
    discount: 23, // 23% off
    category: "Hand Towels",
    images: [
      "/assets/images/features/products/fp3.jpg",
      "/assets/images/features/products/tb1.jpg",
      "/assets/images/features/products/tb2.jpg",
      "/assets/images/features/products/tb3.jpg"
    ],
    inStock: true,
    rating: 4.6,
    reviews: 203,
    tags: ["bamboo", "eco-friendly", "soft", "antibacterial"],
    material: "70% Bamboo Fiber, 30% Cotton",
    dimensions: "13\" x 30\"",
    weight: "120g",
    careInstructions: ["Machine wash warm", "Tumble dry medium", "No bleach"]
  },
  {
    id: "4",
    name: "Heritage Tea Towel Collection",
    description: "A collection of vintage-inspired tea towels featuring traditional patterns and motifs. Each piece tells a story of our textile heritage.",
    price: 35.99,
    originalPrice: 45.99,
    discount: 22, // 22% off
    category: "Kitchen Towels",
    images: [
      "/assets/images/features/products/fp4.jpg",
      "/assets/images/features/products/tb1.jpg",
      "/assets/images/features/products/tb2.jpg",
      "/assets/images/features/products/tb3.jpg"
    ],
    inStock: false,
    rating: 4.7,
    reviews: 156,
    tags: ["vintage", "collection", "heritage", "decorative"],
    material: "100% Cotton with Traditional Dyes",
    dimensions: "18\" x 28\" each",
    careInstructions: ["Gentle machine wash", "Line dry preferred", "Iron with care"]
  },
  {
    id: "5",
    name: "Traditional Embroidered Table Runner",
    description: "Exquisite hand-embroidered table runner featuring traditional motifs. Perfect centerpiece for dining tables and special occasions.",
    price: 55.00,
    originalPrice: 70.00,
    discount: 21,
    category: "Table Linens",
    images: [
      "/assets/images/features/products/fp5.jpg",
      "/assets/images/features/products/ap1.jpg",
      "/assets/images/features/products/ap2.jpg",
      "/assets/images/features/products/ap3.jpg"
    ],
    inStock: true,
    rating: 4.7,
    reviews: 64,
    tags: ["embroidered", "table", "traditional", "handmade"],
    material: "Cotton with Silk Embroidery",
    dimensions: "72\" x 14\"",
    careInstructions: ["Hand wash cold", "Lay flat to dry", "Iron on reverse side"]
  },
  {
    id: "6",
    name: "Organic Cotton Bath Towel Set",
    description: "Luxurious organic cotton bath towels woven using traditional techniques. Soft, absorbent, and naturally antimicrobial.",
    price: 89.99,
    originalPrice: 120.00,
    discount: 25,
    category: "Bath Towels",
    images: [
      "/assets/images/features/products/fp1.jpg",
      "/assets/images/features/products/tb1.jpg",
      "/assets/images/features/products/tb2.jpg",
      "/assets/images/features/products/tb3.jpg"
    ],
    inStock: true,
    rating: 4.9,
    reviews: 198,
    tags: ["organic", "cotton", "bath", "luxury"],
    material: "100% Organic Cotton",
    dimensions: "30\" x 56\" each",
    weight: "600g per towel",
    careInstructions: ["Machine wash warm", "Tumble dry medium", "No fabric softener"]
  },
  {
    id: "7",
    name: "Sustainable Bamboo Kitchen Set",
    description: "Complete kitchen textile set made from sustainable bamboo fiber. Includes dish towels, pot holders, and oven mitts.",
    price: 42.50,
    originalPrice: 55.00,
    discount: 23,
    category: "Kitchen Towels",
    images: [
      "/assets/images/features/products/fp3.jpg",
      "/assets/images/features/products/tb1.jpg",
      "/assets/images/features/products/tb2.jpg",
      "/assets/images/features/products/tb3.jpg"
    ],
    inStock: true,
    rating: 4.5,
    reviews: 87,
    tags: ["bamboo", "sustainable", "kitchen", "set"],
    material: "80% Bamboo Fiber, 20% Cotton",
    dimensions: "Various sizes in set",
    careInstructions: ["Machine wash cold", "Air dry recommended", "No bleach"]
  },
  {
    id: "8",
    name: "Artisan Linen Napkin Set",
    description: "Hand-finished linen napkins with delicate embroidered borders. Perfect for formal dining and special occasions.",
    price: 38.00,
    originalPrice: 48.00,
    discount: 21,
    category: "Table Linens",
    images: [
      "/assets/images/features/products/fp6.jpg",
      "/assets/images/features/products/ap1.jpg",
      "/assets/images/features/products/ap2.jpg",
      "/assets/images/features/products/ap3.jpg"
    ],
    inStock: false,
    rating: 4.8,
    reviews: 45,
    tags: ["linen", "napkins", "formal", "embroidered"],
    material: "100% Pure Linen",
    dimensions: "18\" x 18\" each",
    careInstructions: ["Hand wash preferred", "Iron while damp", "Store flat"]
  }
];

export const categories = [
  "Kitchen Towels",
  "Hand Towels",
  "Bath Towels",
  "Aprons",
  "Table Linens",
  "Decorative Textiles"
];