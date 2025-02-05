// lib/utils.ts
import { Amenity } from "@/lib/types";

export interface AmenitySection {
  title: string;
  data: Amenity[];
}

export function groupAmenitiesByFirstLetter(amenities: Amenity[]): AmenitySection[] {
  const groups: { [key: string]: Amenity[] } = {};
  amenities.forEach((amenity) => {
    const firstLetter = amenity.name[0].toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(amenity);
  });

  // Convert to an array of sections sorted by the letter
  const sections: AmenitySection[] = Object.keys(groups)
    .sort()
    .map((letter) => ({
      title: letter,
      data: groups[letter].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  return sections;
}
