export interface Listing {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorBadge: string;
  title: string;
  price: number | string;
  currency: string;
  description: string;
  image: string;
  whatsapp: string;
  likes?: number;
}
