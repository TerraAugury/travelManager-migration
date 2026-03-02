// Maps country names (from airportCountries.js) to Unicode flag emoji.
// Falls back to 🌐 for "Other" or any unknown name.

const ISO = {
  "Albania": "AL", "Algeria": "DZ", "Angola": "AO", "Argentina": "AR",
  "Armenia": "AM", "Aruba": "AW", "Australia": "AU", "Austria": "AT",
  "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD",
  "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Bolivia": "BO",
  "Bosnia & Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "Brunei": "BN",
  "Bulgaria": "BG", "Cambodia": "KH", "Canada": "CA", "Cape Verde": "CV",
  "Caribbean Netherlands": "BQ", "Cayman Islands": "KY", "Chad": "TD", "Chile": "CL",
  "China": "CN", "Colombia": "CO", "Congo - Kinshasa": "CD", "Costa Rica": "CR",
  "Croatia": "HR", "Cuba": "CU", "Curaçao": "CW", "Cyprus": "CY",
  "Czechia": "CZ", "Denmark": "DK", "Djibouti": "DJ", "Dominican Republic": "DO",
  "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV", "Estonia": "EE",
  "Ethiopia": "ET", "Eswatini": "SZ", "Finland": "FI", "France": "FR",
  "French Guiana": "GF", "French Polynesia": "PF", "Gambia": "GM", "Georgia": "GE",
  "Germany": "DE", "Ghana": "GH", "Gibraltar": "GI", "Greece": "GR",
  "Guadeloupe": "GP", "Guam": "GU", "Guatemala": "GT", "Haiti": "HT",
  "Hong Kong SAR China": "HK", "Hungary": "HU", "Iceland": "IS", "India": "IN",
  "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP",
  "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE", "Kuwait": "KW",
  "Kyrgyzstan": "KG", "Latvia": "LV", "Lebanon": "LB", "Liberia": "LR",
  "Libya": "LY", "Lithuania": "LT", "Luxembourg": "LU", "Macao SAR China": "MO",
  "Madagascar": "MG", "Malaysia": "MY", "Maldives": "MV", "Mali": "ML",
  "Malta": "MT", "Martinique": "MQ", "Mauritania": "MR", "Mauritius": "MU",
  "Mexico": "MX", "Mongolia": "MN", "Montenegro": "ME", "Morocco": "MA",
  "Mozambique": "MZ", "Myanmar (Burma)": "MM", "Namibia": "NA", "Nepal": "NP",
  "Netherlands": "NL", "New Zealand": "NZ", "Niger": "NE", "Nigeria": "NG",
  "North Korea": "KP", "North Macedonia": "MK", "Norway": "NO", "Oman": "OM",
  "Pakistan": "PK", "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY",
  "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT",
  "Puerto Rico": "PR", "Qatar": "QA", "Réunion": "RE", "Romania": "RO",
  "Russia": "RU", "Rwanda": "RW", "São Tomé & Príncipe": "ST", "Saudi Arabia": "SA",
  "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC", "Sierra Leone": "SL",
  "Singapore": "SG", "Sint Maarten": "SX", "Slovakia": "SK", "Slovenia": "SI",
  "Solomon Islands": "SB", "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS",
  "Spain": "ES", "Sri Lanka": "LK", "St. Lucia": "LC", "Sudan": "SD",
  "Suriname": "SR", "Sweden": "SE", "Switzerland": "CH", "Syria": "SY",
  "Taiwan": "TW", "Tanzania": "TZ", "Thailand": "TH", "Tunisia": "TN",
  "Türkiye": "TR", "Turkmenistan": "TM", "Turks & Caicos Islands": "TC", "Uganda": "UG",
  "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US",
  "Uruguay": "UY", "Uzbekistan": "UZ", "Vanuatu": "VU", "Venezuela": "VE",
  "Vietnam": "VN", "Zambia": "ZM", "Zimbabwe": "ZW"
};

export function countryToFlag(name) {
  if (!name || name === "Other") return "🌐";
  const code = ISO[name];
  if (!code) return "🌐";
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E0 - 65 + c.charCodeAt(0)))
    .join("");
}
