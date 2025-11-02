const { decryptionService } = require('./encryption.utils');


function looksLikeHex(s) {
  return (typeof s === 'string') && /^[0-9a-fA-F]{32,}$/.test(s);
}
function looksLikeBase64(s) {
  return (typeof s === 'string') && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s) && s.length >= 16;
}


function safeDecrypt(maybeEncrypted, fieldName = '<field>', opts = { debug: false }) {
  if (maybeEncrypted === undefined || maybeEncrypted === null || maybeEncrypted === '') return null;
  if (typeof maybeEncrypted !== 'string') return maybeEncrypted;

  if (!looksLikeHex(maybeEncrypted) && !looksLikeBase64(maybeEncrypted)) {
    if (opts.debug) console.log(`safeDecrypt: "${fieldName}" doesn't look encrypted — using raw value.`);
    return maybeEncrypted;
  }

  try {
    const decrypted = decryptionService(maybeEncrypted);
    if (decrypted === undefined || decrypted === null || decrypted === '') {
      if (opts.debug) console.warn(`safeDecrypt: decryption returned falsy for "${fieldName}". Falling back to raw.`);
      return maybeEncrypted;
    }
    return decrypted;
  } catch (err) {
    const prefix = maybeEncrypted.slice(0, 12);
    console.error(`safeDecrypt: failed to decrypt ${fieldName} (prefix="${prefix}", len=${maybeEncrypted.length}). Error: ${err.message}`);
    if (opts.debug) console.error(err.stack);
    return maybeEncrypted;
  }
}


function parseAddOnsField(raw, opts = { debug: false }) {
  if (!raw) return [];
  const maybe = safeDecrypt(raw, 'addOns', opts);

  if (Array.isArray(maybe)) return maybe;
  if (typeof maybe === 'object' && maybe !== null) return [maybe];
  if (typeof maybe !== 'string') return [];

  try {
    const parsed = JSON.parse(maybe);
    return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
  } catch (e) {
    try {
      return maybe.split(',').map(s => {
        const parts = s.split(':').map(p => p.trim());
        return { code: parts[0], type: parts[1] || 'percent', value: Number(parts[2] || 0) };
      }).filter(Boolean);
    } catch (err) {
      if (opts.debug) console.warn('parseAddOnsField: CSV fallback failed', err);
      return [];
    }
  }
}


function preprocessRule(rule, opts = { debug: false }) {
  if (!rule) return null;
  return {
    ...rule,
    _decrypted: {
      productType: safeDecrypt(rule.productType, `rule_${rule._id}_productType`, opts),
      effectiveFrom: safeDecrypt(rule.effectiveFrom, `rule_${rule._id}_effectiveFrom`, opts),
      addOns: safeDecrypt(rule.addOns, `rule_${rule._id}_addOns`, opts),
      sumInsured: safeDecrypt(rule.sumInsured, `rule_${rule._id}_sumInsured`, opts),
      basePremium: safeDecrypt(rule.basePremium, `rule_${rule._id}_basePremium`, opts)
    }
  };
}


function chooseRuleFirstMatch(pricingRules, productType, age, quoteDate = new Date(), opts = { debug: false }) {
  const debug = opts.debug || false;
  if (!Array.isArray(pricingRules)) return null;

  const wanted = (productType || '').toString().trim().toLowerCase();
  const qDate = (quoteDate instanceof Date) ? quoteDate : new Date(quoteDate);

  for (let i = 0; i < pricingRules.length; i++) {
    const rawRule = pricingRules[i];
    if (!rawRule) continue;

    const r = preprocessRule(rawRule, opts);
    const decrypted = r._decrypted || {};

    const ruleProduct = (decrypted.productType || rawRule.productType || '').toString().trim().toLowerCase();
    if (ruleProduct !== wanted) {
      if (debug) console.log(`rule[${i}] product mismatch: "${ruleProduct}" !== "${wanted}"`);
      continue;
    }

    const minAge = (rawRule.minAge === undefined || rawRule.minAge === null || rawRule.minAge === '') ? -Infinity : Number(rawRule.minAge);
    const maxAge = (rawRule.maxAge === undefined || rawRule.maxAge === null || rawRule.maxAge === '') ? Infinity : Number(rawRule.maxAge);
    if (isNaN(minAge) || isNaN(maxAge)) {
      if (debug) console.log(`rule[${i}] invalid age bounds, skipping`);
      continue;
    }
    if (!(age >= minAge && age <= maxAge)) {
      if (debug) console.log(`rule[${i}] age ${age} outside [${minAge},${maxAge}]`);
      continue;
    }

    const effRaw = decrypted.effectiveFrom || rawRule.effectiveFrom || null;
    if (effRaw) {
      const effDate = new Date(effRaw);
      if (isNaN(effDate.getTime())) {
        if (debug) console.log(`rule[${i}] effectiveFrom unparsable ("${effRaw}"), treating as effective`);
      } else {
        if (effDate.getTime() > qDate.getTime()) {
          if (debug) console.log(`rule[${i}] not effective until ${effDate.toISOString()}, skipping`);
          continue;
        }
      }
    }

    if (debug) console.log(`chooseRuleFirstMatch: matched rule[${i}] _id=${rawRule._id}`);
    return rawRule;
  }

  if (debug) console.log('chooseRuleFirstMatch: no match found');
  return null;
}

function round2(x) {
  const num = Number(x || 0);
  return Math.round(num * 100) / 100;
}


function computeFullQuote(pricingRules, request, opts = { debug: false }) {
  const {
    productType,
    age,
    sumInsured,
    quoteDate = new Date(),
    addOnsRequested = [],
    taxPercent = 18,
    paymentFrequency = 'annual'
  } = request;

  const debug = opts.debug || false;
  const rule = chooseRuleFirstMatch(pricingRules, productType, age, quoteDate, { debug });

  if (!rule) {
    return { error: 'No pricing rule matches the productType/age/date' };
  }

  const ruleAddOns = parseAddOnsField(rule.addOns || rule._decrypted?.addOns, { debug });

  const bucketSize = Number(safeDecrypt(rule.sumInsured, `rule_${rule._id}_sumInsured`, { debug }) || rule.sumInsured) || 1;
  const basePremiumBucket = Number(safeDecrypt(rule.basePremium, `rule_${rule._id}_basePremium`, { debug }) || rule.basePremium) || 0;

  const multiplier = Number(sumInsured) / bucketSize;
  const scaledBasePremium = basePremiumBucket * multiplier;

  const addOnsToApply = (Array.isArray(addOnsRequested) && addOnsRequested.length > 0)
    ? ruleAddOns.filter(a => addOnsRequested.includes(a.code))
    : ruleAddOns;

  let addOnDetails = [];
  let totalAddOns = 0;

  for (const a of addOnsToApply) {
    const type = a.type || 'percent';
    const value = Number(a.value || 0);
    if (type === 'percent') {
      const amt = scaledBasePremium * value;
      totalAddOns += amt;
      addOnDetails.push({ code: a.code, type, value, amount: round2(amt) });
    } else {
      totalAddOns += value;
      addOnDetails.push({ code: a.code, type, value, amount: round2(value) });
    }
  }

  const subTotal = scaledBasePremium + totalAddOns;
  const taxAmount = subTotal * (Number(taxPercent) / 100.0);
  const totalPayable = subTotal + taxAmount;

  const modalMap = { annual: 1.0, quarterly: 0.26, monthly: 0.09 };
  const modalFactor = modalMap[paymentFrequency] || 1.0;
  const installments = paymentFrequency === 'monthly' ? 12 : paymentFrequency === 'quarterly' ? 4 : 1;
  const installmentAmount = round2(totalPayable * modalFactor);

  return {
    quoteId: `q_${Date.now()}`,
    productType,
    appliedRuleId: rule._id,
    ruleBucket: { sumInsured: bucketSize, basePremium: basePremiumBucket },
    requestedSumInsured: sumInsured,
    multiplier: round2(multiplier),
    scaledBasePremium: round2(scaledBasePremium),
    addOns: addOnDetails,
    totalAddOns: round2(totalAddOns),
    subTotal: round2(subTotal),
    taxPercent: Number(taxPercent),
    taxAmount: round2(taxAmount),
    totalPayable: round2(totalPayable),
    paymentSchedule: {
      frequency: paymentFrequency,
      installments,
      installmentAmount
    }
  };
}

module.exports = { computeFullQuote, chooseRuleFirstMatch, parseAddOnsField, safeDecrypt };
