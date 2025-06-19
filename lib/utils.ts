import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to get organization logo path
export function getOrganizationLogo(organization: string): string {
  switch (organization) {
    case "PDNSW":
      return "/New_South_Wales_Government_logo.svg.png";
    case "WSP":
      return "/wsp-logo.png";
    case "Giraffe":
      return "/giraffelogo.png";
    default:
      return "";
  }
}

// Helper function to render person name with organization logo
export function getPersonNameWithLogo(person: { name: string; organisation: string }) {
  const logoPath = getOrganizationLogo(person.organisation);
  return {
    name: person.name,
    logoPath,
    hasLogo: logoPath !== "",
  };
}
