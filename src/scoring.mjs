function round(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function matchCount(filters, metadata) {
  let count = 0;
  const checks = [
    ['brands', 'brand'],
    ['stores', 'store'],
    ['categories', 'category'],
    ['productNames', 'productName'],
    ['regions', 'region']
  ];
  for (const [filterKey, metaKey] of checks) {
    const wanted = Array.isArray(filters?.[filterKey]) ? filters[filterKey] : [];
    if (!wanted.length) continue;
    const actual = String(metadata?.[metaKey] || '').trim().toLowerCase();
    if (actual && wanted.some((item) => String(item).trim().toLowerCase() === actual)) count += 1;
  }
  return count;
}

export function scoreOpportunity(event, config) {
  const metadata = event.metadata || {};
  const reasons = [];
  let score = 0;

  const trust = Number(event.trustScore || 0);
  const quality = Number(event.qualityScore || 0);
  score += trust * 0.2;
  score += quality * 0.2;
  reasons.push(`trust ${trust}`);
  reasons.push(`quality ${quality}`);

  const current = Number(metadata.priceCurrent);
  const previous = Number(metadata.pricePrevious);
  const discountPct = Number.isFinite(Number(metadata.discountPct)) ? Number(metadata.discountPct) : null;
  const computedDiscount = current > 0 && previous > current ? ((previous - current) / previous) * 100 : null;
  const effectiveDiscount = discountPct ?? computedDiscount;
  if (Number.isFinite(effectiveDiscount)) {
    score += Math.min(35, Number(effectiveDiscount));
    reasons.push(`discount ${Math.round(effectiveDiscount)}%`);
  }

  if (Number.isFinite(current) && Number.isFinite(config.filters.priceMax)) {
    if (current <= config.filters.priceMax) {
      score += 15;
      reasons.push(`under max price ${config.filters.priceMax}`);
    } else {
      score -= 10;
      reasons.push(`above max price ${config.filters.priceMax}`);
    }
  }

  const matchedFilters = matchCount(config.filters, metadata);
  if (matchedFilters > 0) {
    score += matchedFilters * 8;
    reasons.push(`${matchedFilters} exact filter matches`);
  }

  if (metadata.inStock === true) {
    score += 8;
    reasons.push('in stock');
  }

  if (event.eventType === 'stock.available') {
    score += 10;
    reasons.push('stock returned');
  }

  if (event.eventType === 'launch.available') {
    score += 12;
    reasons.push('launch available');
  }

  const finalScore = round(score);
  const priority = finalScore >= 80 ? 'critical' : finalScore >= 60 ? 'high' : finalScore >= 40 ? 'medium' : 'low';
  const action = finalScore >= 80 ? 'act_now' : finalScore >= 60 ? 'review_now' : 'watch';
  const productLabel = metadata.productName || event.title;
  const storeLabel = metadata.store ? ` at ${metadata.store}` : '';
  const actionHint =
    action === 'act_now'
      ? `Act now on ${productLabel}${storeLabel}.`
      : action === 'review_now'
        ? `Review ${productLabel}${storeLabel} soon.`
        : `Watch ${productLabel}${storeLabel} for follow-up.`;

  return {
    score: finalScore,
    priority,
    action,
    actionHint,
    reasons
  };
}

export function buildOpportunity(event, config) {
  const scored = scoreOpportunity(event, config);
  return {
    id: String(event.id),
    eventId: Number(event.id),
    status: 'open',
    createdAt: event.createdAt,
    updatedAt: new Date().toISOString(),
    eventType: event.eventType,
    topic: event.topic,
    title: event.title,
    summary: event.summary,
    sourceUrl: event.sourceUrl || event.canonicalUrl || null,
    publisher: event.publisher || null,
    trustScore: Number(event.trustScore || 0),
    qualityScore: Number(event.qualityScore || 0),
    metadata: event.metadata || {},
    policy: config.policy,
    ...scored
  };
}
