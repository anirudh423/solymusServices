const express = require('express');
function getBaseRate(product) {
  const rates = {
    health: 0.005,   
    term: 0.0006,
    motor: 0.012
  };
  return rates[product] ?? 0.005;
}

function getAgeLoadingPct(age) {
  if (age <= 25) return 0;
  if (age <= 40) return 0.20;
  if (age <= 55) return 0.40;
  return 0.80;
}

function getModalFactor(frequency) {
  const map = {
    annual: 1.0,
    quarterly: 0.26,
    monthly: 0.09
  };
  return map[frequency] ?? 1.0;
}

function round2(x) { return Math.round(x * 100) / 100; }

function quickQuote(payload) {
  const taxPercent = 18.0;

  const baseRate = getBaseRate(payload.product);
  const basePremium = payload.sumInsured * baseRate * (payload.tenureYears || 1);

  const ageLoadPct = getAgeLoadingPct(payload.age);
  const ageLoading = basePremium * ageLoadPct;

  const smokerLoading = (payload.smoker === true) ? basePremium * 0.25 : 0;

  const subTotal = basePremium + ageLoading + smokerLoading;

  const taxAmount = subTotal * (taxPercent / 100.0);
  const annualTotal = subTotal + taxAmount;

  const modalFactor = getModalFactor(payload.paymentFrequency || 'annual');
  const installment = round2(annualTotal * modalFactor);
  const installments = (payload.paymentFrequency === 'monthly') ? 12 : (payload.paymentFrequency === 'quarterly' ? 4 : 1);

  return {
    quoteId: `q_${Date.now()}`,
    product: payload.product,
    sumInsured: payload.sumInsured,
    tenureYears: payload.tenureYears || 1,
    age: payload.age,
    basePremium: round2(basePremium),
    ageLoading: round2(ageLoading),
    smokerLoading: round2(smokerLoading),
    subTotal: round2(subTotal),
    taxPercent,
    taxAmount: round2(taxAmount),
    totalPayable: round2(annualTotal),
    paymentSchedule: {
      frequency: payload.paymentFrequency || 'annual',
      installmentAmount: installment,
      installments
    }
  };
}


module.exports = { quickQuote };
