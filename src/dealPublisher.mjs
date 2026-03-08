function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function firstTextMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeWhitespace(match[1]);
  }
  return '';
}

function parseMoney(value) {
  const raw = String(value || '').replace(/\\u[0-9a-f]{4}/gi, '').trim();
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(/,(?=\d{2}$)/, '.').replace(/,/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function extractJsonLdObjects(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const out = [];
  for (const [, raw] of blocks) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {}
  }
  return out;
}

function findOfferObject(objects) {
  const queue = [...objects];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    const type = current['@type'];
    if (type === 'Product' && current.offers) {
      const offers = Array.isArray(current.offers) ? current.offers[0] : current.offers;
      if (offers && typeof offers === 'object') return { product: current, offer: offers };
    }
    if (type === 'Offer') return { product: null, offer: current };
    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') queue.push(value);
    }
  }
  return { product: null, offer: null };
}

function steamInfo(html) {
  const finalPrice = parseMoney(firstTextMatch(html, [
    /"final_formatted"\s*:\s*"([^\"]+)"/i,
    /discount_final_price[^>]*>\s*([^<]+)</i
  ]));
  const initialPrice = parseMoney(firstTextMatch(html, [
    /"initial_formatted"\s*:\s*"([^\"]+)"/i,
    /discount_original_price[^>]*>\s*([^<]+)</i
  ]));
  const discountPctText = firstTextMatch(html, [/discount_pct[^>]*>\s*(-?\d+%)</i]);
  const productName = firstTextMatch(html, [/<div class="apphub_AppName">([^<]+)</i, /<title>([^<]+) on Steam/i]);
  return {
    productName,
    priceCurrent: finalPrice,
    pricePrevious: initialPrice,
    discountPct: discountPctText ? Math.abs(Number(discountPctText.replace('%', ''))) : undefined,
    inStock: true,
    available: finalPrice != null || initialPrice != null
  };
}

function genericInfo(html, fallbackName = '') {
  const objects = extractJsonLdObjects(html);
  const { product, offer } = findOfferObject(objects);
  const metaProductName = product?.name || fallbackName || firstTextMatch(html, [/<title>([^<]+)</i]);
  const priceCurrent = parseMoney(offer?.price ?? firstTextMatch(html, [
    /itemprop=["']price["'][^>]*content=["']([^"']+)/i,
    /"price"\s*:\s*"?([0-9.,]+)/i,
    /sale-price[^>]*content=["']([^"']+)/i,
    /price[^>]*content=["']([^"']+)/i,
    />\s*\$\s*([0-9.,]+)\s*</i
  ]));
  const pricePrevious = parseMoney(firstTextMatch(html, [
    /"highPrice"\s*:\s*"?([0-9.,]+)/i,
    /regular-price[^>]*content=["']([^"']+)/i,
    /compare_at_price[^>]*content=["']([^"']+)/i,
    /was[^$]{0,20}\$\s*([0-9.,]+)/i
  ]));
  const availabilityRaw = String(offer?.availability || firstTextMatch(html, [/availability[^>]*content=["']([^"']+)/i])).toLowerCase();
  const inStock = availabilityRaw ? /(instock|preorder|pre-order|available)/i.test(availabilityRaw) : undefined;
  return {
    productName: normalizeWhitespace(metaProductName),
    priceCurrent,
    pricePrevious,
    discountPct: priceCurrent != null && pricePrevious != null && pricePrevious > priceCurrent
      ? Number((((pricePrevious - priceCurrent) / pricePrevious) * 100).toFixed(2))
      : undefined,
    inStock,
    available: priceCurrent != null || Boolean(availabilityRaw)
  };
}

export async function fetchProductSnapshot(config) {
  const response = await fetch(config.productUrl, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 PushMeAgentTools/0.2',
      accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!response.ok) throw new Error(`Product fetch failed with ${response.status}`);
  const html = await response.text();
  const url = response.url || config.productUrl;
  const fromSteam = /store\.steampowered\.com/i.test(url);
  const parsed = fromSteam ? steamInfo(html) : genericInfo(html, config.productName);
  const productName = normalizeWhitespace(parsed.productName || config.productName).replace(/^save\s+\d+%\s+on\s+/i, '');
  return {
    fetchedAt: new Date().toISOString(),
    url,
    productName,
    priceCurrent: parsed.priceCurrent,
    pricePrevious: parsed.pricePrevious,
    discountPct: parsed.discountPct,
    inStock: typeof parsed.inStock === 'boolean' ? parsed.inStock : true,
    available: parsed.available,
    title: productName
  };
}

export function classifyDealEvent(current, previous) {
  const changedPrice = previous && current.priceCurrent != null && previous.priceCurrent != null && current.priceCurrent !== previous.priceCurrent;
  const becameAvailable = previous && previous.inStock === false && current.inStock === true;
  const initialSeen = !previous;

  if (changedPrice && current.pricePrevious != null && current.priceCurrent < current.pricePrevious) return 'price.dropped';
  if (current.discountPct != null && current.discountPct > 0 && (initialSeen || changedPrice)) return changedPrice ? 'discount.changed' : 'discount.started';
  if (becameAvailable || (initialSeen && current.inStock)) return 'stock.available';
  if (initialSeen) return 'launch.available';
  return null;
}

export function buildDealEventPayload(config, current, previous) {
  const eventType = classifyDealEvent(current, previous);
  if (!eventType) return null;
  const topic = `${config.category || config.brand || config.productName} deals`.trim();
  const store = config.store;
  const title =
    eventType === 'price.dropped'
      ? `${current.productName} drops to ${config.currency} ${current.priceCurrent} at ${store}`
      : eventType === 'stock.available'
        ? `${current.productName} is available at ${store}`
        : eventType === 'launch.available'
          ? `${current.productName} listing is live at ${store}`
          : `${current.productName} discount changes at ${store}`;

  const summaryParts = [];
  if (current.priceCurrent != null) summaryParts.push(`Current price ${config.currency} ${current.priceCurrent}`);
  if (current.pricePrevious != null && current.pricePrevious !== current.priceCurrent) summaryParts.push(`previously ${config.currency} ${current.pricePrevious}`);
  if (current.discountPct != null && current.discountPct > 0) summaryParts.push(`${current.discountPct}% off`);
  if (typeof current.inStock === 'boolean') summaryParts.push(current.inStock ? 'in stock' : 'out of stock');

  const metadata = Object.fromEntries(Object.entries({
    productName: current.productName,
    brand: config.brand || null,
    store,
    category: config.category || null,
    region: config.region,
    currency: config.currency,
    priceCurrent: current.priceCurrent,
    pricePrevious: current.pricePrevious,
    discountPct: current.discountPct,
    inStock: current.inStock,
    observedAt: current.fetchedAt,
    canonicalProductUrl: current.url
  }).filter(([, value]) => value !== null && value !== undefined));

  return {
    eventType,
    topic,
    title,
    summary: summaryParts.join(', '),
    body: [
      `Product: ${current.productName}`,
      `Store: ${store}`,
      config.brand ? `Brand: ${config.brand}` : null,
      config.category ? `Category: ${config.category}` : null,
      `Region: ${config.region}`,
      current.priceCurrent != null ? `Current price: ${config.currency} ${current.priceCurrent}` : null,
      current.pricePrevious != null ? `Previous price: ${config.currency} ${current.pricePrevious}` : null,
      current.discountPct != null ? `Discount: ${current.discountPct}%` : null,
      `In stock: ${current.inStock}`,
      `Observed at: ${current.fetchedAt}`,
      `Source: ${current.url}`
    ].filter(Boolean).join('\n'),
    sourceUrl: config.sourceUrl || current.url,
    externalId: `${config.store}-${config.productName}-${eventType}-${current.fetchedAt}`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-'),
    tags: [config.store, config.brand, config.category, 'deal', eventType.split('.')[0]].filter(Boolean).map((v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 12),
    metadata
  };
}
