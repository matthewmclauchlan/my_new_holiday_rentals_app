// lib/types.ts


// Filter options (already used in your project)
export interface FilterOptions {
  category: string;
  location: string;
  priceMin: number;
  priceMax: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  guestCount: number;
  startDate: string | null;
  endDate: string | null;
}

// The structure for a property document in your properties collection
export interface Property {
  $id: string;
  name: string;
  type:
    | "House"
    | "Condo"
    | "Apartment"
    | "Townhouse"
    | "Villa"
    | "Cottage"
    | "Bungalow"
    | "Duplex"
    | "Loft"
    | "Penthouse"
    | "Studio"
    | "Mansion"
    | "Cabin"
    | "Farmhouse"
    | "Other";
  description: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  rating: "1" | "2" | "3" | "4" | "5";
  area: number;
  amenities: string[]; // Typically an array of IDs or names from your amenities collection
  houseRulesId: string;
  isFeatured: boolean;
  createdAt: string; // ISO date string; you could use Date if you prefer
  updatedAt: string;
  pricePerNight: number;
  userId: string; // This field now stores the owner's (user's) ID
  geolocation: string; // e.g. "lat,lng"
  mediaIds: string[]; // An array of file IDs from your media bucket
  status: "active" | "pending" | "sold" | "delisted";
  catastro: string;
  vutNumber: string;
  approvalStatus: "pending" | "approved" | "rejected" | "reachout";
  descisionDate: string;
  hostId: string;
}

// The structure for a host profile document in your host collection
export interface HostProfile {
  $id: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  hostDocumentId: string;
  descisionDate: string;
  termsAccepted: string;
  hostid: string;
}

// The structure for a role document in your roles collection
export interface RoleDocument {
  $id: string;
  userId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// (Optional) A simplified user interface – adjust as needed.
export interface User {
  $id: string;
  name: string;
  email: string;
  avatar: string;
  hostProfile?: HostProfile | null;
  roles?: string[];
}

export interface Amenity {
  $id: string;
  name: string;      
  icon: string;       // URL or local asset key—for example, using a mapping
}

export interface HelpArticleFields {
  title: string;
  slug: string;
  content: any; // Rich text field
  summary: string;
  publishDate: string;
}


export interface HelpArticle {
  sys: {
    id: string;
    type: string;
    createdAt: string;
    updatedAt: string;
    revision: number;
    contentType: {
      sys: {
        id: string;
        type: string;
      };
    };
  };
  fields: HelpArticleFields;
}
