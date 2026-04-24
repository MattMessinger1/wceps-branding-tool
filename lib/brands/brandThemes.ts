export type BrandTheme = {
  brandName: string;
  fontFamily: string;
  colors: {
    ink: string;
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    soft: string;
  };
};

const defaultTheme: BrandTheme = {
  brandName: "WCEPS",
  fontFamily: "Montserrat, Arial, sans-serif",
  colors: {
    ink: "#20252A",
    primary: "#126C75",
    secondary: "#0081A4",
    accent: "#E7B94C",
    surface: "#FFFFFF",
    soft: "#F7F4EE",
  },
};

const brandThemes: Record<string, BrandTheme> = {
  WCEPS: defaultTheme,
  "CARE Coaching": {
    brandName: "CARE Coaching",
    fontFamily: "Montserrat, Arial, sans-serif",
    colors: {
      ink: "#20252A",
      primary: "#0081A4",
      secondary: "#5EA974",
      accent: "#F7D470",
      surface: "#FFFFFF",
      soft: "#EAF7F8",
    },
  },
  CCNA: {
    brandName: "CCNA",
    fontFamily: "Montserrat, Arial, sans-serif",
    colors: {
      ink: "#20252A",
      primary: "#0081A4",
      secondary: "#3EB3BD",
      accent: "#F7D470",
      surface: "#FFFFFF",
      soft: "#EAF7F8",
    },
  },
  WebbAlign: {
    brandName: "WebbAlign",
    fontFamily: "Montserrat, Arial, sans-serif",
    colors: {
      ink: "#20252A",
      primary: "#0081A4",
      secondary: "#3EB3BD",
      accent: "#F7D470",
      surface: "#FFFFFF",
      soft: "#F7FBFA",
    },
  },
  CALL: {
    brandName: "CALL",
    fontFamily: "Montserrat, Arial, sans-serif",
    colors: {
      ink: "#20252A",
      primary: "#143F6B",
      secondary: "#0081A4",
      accent: "#F7D470",
      surface: "#FFFFFF",
      soft: "#F4F8FB",
    },
  },
  "WIDA PRIME": {
    brandName: "WIDA PRIME",
    fontFamily: "Montserrat, Arial, sans-serif",
    colors: {
      ink: "#1F2937",
      primary: "#0057A8",
      secondary: "#00A6A6",
      accent: "#F6A800",
      surface: "#FFFFFF",
      soft: "#EEF7FB",
    },
  },
};

export function getBrandTheme(brandName: string) {
  return brandThemes[brandName] ?? defaultTheme;
}
