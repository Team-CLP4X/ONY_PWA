export interface FirestoreMerchant {
  id?: string;
  name: string;
  category: string;
  offer: string;
  value: string;
  description: string;
  image: string;
  validity: string;
  active?: boolean;
  expired?: boolean;
  tags?: string[];
}
