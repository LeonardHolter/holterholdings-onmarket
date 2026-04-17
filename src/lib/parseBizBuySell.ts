export interface ParsedListing {
  business_name: string;
  location: string;
  asking_price: number | null;
  ebitda_sde: number | null;
  ebitda_sde_type: "SDE" | "EBITDA";
  revenue: number | null;
  description: string;
  listing_url: string;
  broker_name: string;
  broker_company: string;
  broker_phone: string;
  ad_number: string;
}

function parseMoney(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function match(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1] : null;
}

export function parseBizBuySell(input: string): ParsedListing {
  // Normalize line endings and collapse multiple blank lines.
  const text = input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const result: ParsedListing = {
    business_name: "",
    location: "",
    asking_price: null,
    ebitda_sde: null,
    ebitda_sde_type: "SDE",
    revenue: null,
    description: "",
    listing_url: "",
    broker_name: "",
    broker_company: "",
    broker_phone: "",
    ad_number: "",
  };

  // URL – grab first bizbuysell link if present.
  const urlMatch = text.match(/https?:\/\/[^\s]*bizbuysell\.com\/[^\s]+/i);
  if (urlMatch) result.listing_url = urlMatch[0];

  // Business name and optional location line – sit between "My BizBuySell"
  // and "Asking Price:". The first non-empty line is the business name; an
  // optional second line is the location.
  const headerMatch = text.match(
    /My BizBuySell\s*\n+([\s\S]+?)\n\s*Asking Price:/
  );
  if (headerMatch) {
    const lines = headerMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length >= 1) result.business_name = lines[0];
    if (lines.length >= 2) {
      // Location typically looks like "City, ST" or "City, ST (County)".
      const loc = lines[1];
      if (/,\s*[A-Z]{2}\b/.test(loc) || /\(.+\)/.test(loc)) {
        result.location = loc;
      }
    }
  }

  // Asking Price
  const asking = match(text, /Asking Price:\s*\n?\s*\$?([\d,]+)/);
  result.asking_price = parseMoney(asking ?? undefined);

  // SDE and EBITDA – prefer SDE when both disclosed.
  const sdeRaw = match(text, /Cash Flow \(SDE\):\s*\n?\s*\$?([\d,]+)/);
  const ebitdaRaw = match(text, /EBITDA:\s*\n?\s*\$?([\d,]+)/);
  if (sdeRaw) {
    result.ebitda_sde = parseMoney(sdeRaw);
    result.ebitda_sde_type = "SDE";
  } else if (ebitdaRaw) {
    result.ebitda_sde = parseMoney(ebitdaRaw);
    result.ebitda_sde_type = "EBITDA";
  }

  // Revenue
  const rev = match(text, /Gross Revenue:\s*\n?\s*\$?([\d,]+)/);
  result.revenue = parseMoney(rev ?? undefined);

  // Description – between "Business Description" heading and the Ad#/Detailed
  // Information / Business Location sections.
  const descMatch = text.match(
    /Business Description\s*\n+([\s\S]+?)(?:\n\s*Ad#:|\n\s*Detailed Information|\n\s*Business Location)/
  );
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // Ad#
  const ad = match(text, /Ad#:\s*(\d+)/);
  if (ad) result.ad_number = ad;

  // Broker – two lines right after "Business Listed By:"
  const brokerMatch = text.match(
    /Business Listed By:\s*\n+([^\n]+)\n([^\n]+)/
  );
  if (brokerMatch) {
    result.broker_name = brokerMatch[1].trim();
    result.broker_company = brokerMatch[2].trim();

    // Phone – first XXX-XXX-XXXX after the broker section (skip the user's
    // own phone that appears in the Contact Form earlier in the page).
    const tail = text.slice(
      (brokerMatch.index ?? 0) + brokerMatch[0].length
    );
    const phoneMatch = tail.match(/(\d{3}[- .]\d{3}[- .]\d{4})/);
    if (phoneMatch) {
      result.broker_phone = phoneMatch[1].replace(/[.\s]/g, "-");
    }
  }

  return result;
}
