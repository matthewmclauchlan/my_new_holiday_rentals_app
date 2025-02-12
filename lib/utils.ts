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

// Add getDatesInRange function
export function getDatesInRange(startDate: string, endDate: string): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = ("0" + (current.getMonth() + 1)).slice(-2);
    const day = ("0" + current.getDate()).slice(-2);
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
