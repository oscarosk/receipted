// The two demo stores. Both are fictional. Quiet Hour Audio uses Receipted; MegaBoom Sound
// is the look-alike competitor whose reviews are unproven (and, in the demo, AI-written).

export type StoreId = "quiet-hour" | "megaboom";

export type Store = {
  id: StoreId;
  name: string;
  tagline: string;
  usesReceipted: boolean;
  accent: string; // tailwind colour family for light theming
};

export type Product = {
  id: string;
  store: StoreId;
  name: string;
  price: string; // USD, two decimals
  blurb: string;
  specs: string[];
};

export const STORES: Record<StoreId, Store> = {
  "quiet-hour": {
    id: "quiet-hour",
    name: "Quiet Hour Audio",
    tagline: "Small-batch headphones. Every review is from someone PayPal says paid.",
    usesReceipted: true,
    accent: "emerald",
  },
  megaboom: {
    id: "megaboom",
    name: "MegaBoom Sound",
    tagline: "The #1 rated headphones on the internet!!!",
    usesReceipted: false,
    accent: "orange",
  },
};

export const PRODUCTS: Product[] = [
  {
    id: "qh-1",
    store: "quiet-hour",
    name: "QH-1 Over-Ear Headphones",
    price: "79.00",
    blurb: "Closed-back, 32-hour battery, honest bass. Folds flat.",
    specs: ["Active noise cancelling", "32 h battery", "USB-C and 3.5 mm", "260 g"],
  },
  {
    id: "qh-buds",
    store: "quiet-hour",
    name: "QH Buds",
    price: "49.00",
    blurb: "Small earbuds with a case that fits a coin pocket.",
    specs: ["7 h battery (+21 h case)", "IPX4", "Bluetooth 5.4"],
  },
  {
    id: "qh-stand",
    store: "quiet-hour",
    name: "Walnut Headphone Stand",
    price: "19.00",
    blurb: "One piece of oiled walnut. Holds any over-ear pair.",
    specs: ["Solid walnut", "Felt base", "Hand finished"],
  },
  {
    id: "mb-x1",
    store: "megaboom",
    name: "MB-X1 PRO MAX Wireless Headphones",
    price: "59.00",
    blurb: "INSANE BASS. 100 hour battery. Studio quality. Best headphones 2026!",
    specs: ["\"Hybrid ANC\"", "\"100 h\" battery", "Bluetooth"],
  },
];

export function product(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

export function productsOf(store: StoreId) {
  return PRODUCTS.filter((p) => p.store === store);
}
