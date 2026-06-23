import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Check, X, ArrowLeft } from "lucide-react";

/* ============================================================
   SEEDED RNG + HELPERS
   ============================================================ */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t |= 0; t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick(rng, arr) {
  return arr[randInt(rng, 0, arr.length - 1)];
}
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildOptions(rng, correct, distractors) {
  const seen = new Set([String(correct)]);
  const finalDistractors = [];
  for (const d of distractors) {
    const key = String(d);
    if (!seen.has(key)) {
      seen.add(key);
      finalDistractors.push(d);
    }
    if (finalDistractors.length === 3) break;
  }
  let guard = 0;
  while (finalDistractors.length < 3 && guard < 200) {
    guard++;
    const jitter = typeof correct === "number" ? correct + randInt(rng, -10, 10) : correct + "_";
    const key = String(jitter);
    if (!seen.has(key) && (typeof jitter !== "number" || jitter >= 0)) {
      seen.add(key);
      finalDistractors.push(jitter);
    }
  }
  const all = shuffle(rng, [correct, ...finalDistractors]);
  return { options: all.map(String), correctIndex: all.indexOf(correct) };
}
function numDistractors(rng, correct, scale) {
  const out = [];
  const offsets = shuffle(
    rng,
    [1, 2, -1, -2, scale, -scale, scale * 2, -scale * 2, 10, -10].filter((o) => o !== 0)
  );
  for (const o of offsets) {
    const v = correct + o;
    if (v < 0) continue;
    out.push(v);
    if (out.length >= 6) break;
  }
  return out;
}
function gradeRange(grade, table) {
  return table[Math.min(grade, table.length) - 1];
}

/* ============================================================
   ROMAN NUMERALS
   ============================================================ */
const ROMAN_MAP = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
function toRoman(num) {
  let res = "";
  for (const [v, s] of ROMAN_MAP) {
    while (num >= v) { res += s; num -= v; }
  }
  return res;
}

/* ============================================================
   CATEGORY (TOPIC) GENERATORS
   Each generator takes a "tier" 1-5 that controls difficulty.
   ============================================================ */
/* ============================================================
   NUMBERS & NUMERATION — advanced 4th/5th grade question set
   (digit-clue riddles, Indian/International naming, place-value
   differences, rounding, place-value jumps, digit arrangement,
   and richer number patterns)
   ============================================================ */
const ONES_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS_WORDS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function twoDigitWords(n) {
  if (n < 20) return ONES_WORDS[n];
  const t = Math.floor(n / 10), r = n % 10;
  return TENS_WORDS[t] + (r ? " " + ONES_WORDS[r] : "");
}
function threeDigitWords(n) {
  const h = Math.floor(n / 100), r = n % 100;
  if (h === 0) return twoDigitWords(r);
  return ONES_WORDS[h] + " Hundred" + (r ? " " + twoDigitWords(r) : "");
}
function numberToWordsInternational(n) {
  if (n === 0) return "Zero";
  let billions = Math.floor(n / 1e9); n %= 1e9;
  let millions = Math.floor(n / 1e6); n %= 1e6;
  let thousands = Math.floor(n / 1e3); n %= 1e3;
  const rem = n;
  let parts = [];
  if (billions) parts.push(threeDigitWords(billions) + " Billion");
  if (millions) parts.push(threeDigitWords(millions) + " Million");
  if (thousands) parts.push(threeDigitWords(thousands) + " Thousand");
  if (rem || parts.length === 0) parts.push(threeDigitWords(rem));
  return parts.join(" ").trim();
}
function numberToWordsIndian(n) {
  if (n === 0) return "Zero";
  let crore = Math.floor(n / 1e7); n %= 1e7;
  let lakh = Math.floor(n / 1e5); n %= 1e5;
  let thousand = Math.floor(n / 1e3); n %= 1e3;
  let hundred = Math.floor(n / 100); n %= 100;
  const rem = n;
  let parts = [];
  if (crore) parts.push(twoDigitWords(crore) + " Crore");
  if (lakh) parts.push(twoDigitWords(lakh) + " Lakh");
  if (thousand) parts.push(twoDigitWords(thousand) + " Thousand");
  if (hundred) parts.push(ONES_WORDS[hundred] + " Hundred");
  if (rem || parts.length === 0) parts.push(twoDigitWords(rem));
  return parts.join(" ").trim();
}
function indianCommaFormat(numStr) {
  const s = String(numStr);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  let remaining = s.slice(0, -3);
  const groups = [];
  while (remaining.length > 2) { groups.unshift(remaining.slice(-2)); remaining = remaining.slice(0, -2); }
  if (remaining) groups.unshift(remaining);
  return groups.join(",") + "," + last3;
}
function intlCommaFormat(numStr) {
  return String(numStr).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function PLACE_NAMES(length) {
  const names = ["ones", "tens", "hundreds", "thousands", "ten-thousands", "hundred-thousands", "millions"];
  const arr = [];
  for (let idx = 0; idx < length; idx++) arr.push(names[length - 1 - idx]);
  return arr;
}
function randomDigits(rng, length) {
  const d = [randInt(rng, 1, 9)];
  for (let i = 1; i < length; i++) d.push(randInt(rng, 0, 9));
  return d;
}

function buildRiddle(rng, length) {
  const places = PLACE_NAMES(length);
  const digits = new Array(length).fill(null);
  const clues = [];
  const order = shuffle(rng, [...Array(length).keys()]);

  const firstIdx = order[0];
  const firstVal = randInt(rng, firstIdx === 0 ? 1 : 0, 9);
  digits[firstIdx] = firstVal;
  clues.push(`My ${places[firstIdx]} digit is ${firstVal}.`);

  for (let i = 1; i < order.length; i++) {
    const idx = order[i];
    const isLeading = idx === 0;
    const assignedIdxs = order.slice(0, i);
    let success = false, attempts = 0;
    while (!success && attempts < 40) {
      attempts++;
      const relType = pick(rng, assignedIdxs.length >= 2 ? ["multiple", "moreThan", "lessThan", "sum", "diff", "equal"] : ["multiple", "moreThan", "lessThan", "equal"]);
      if (relType === "multiple") {
        const refIdx = pick(rng, assignedIdxs);
        const refVal = digits[refIdx];
        if (refVal === 0) continue;
        const k = randInt(rng, 2, 9);
        const val = refVal * k;
        if (val > 9 || (isLeading && val === 0)) continue;
        digits[idx] = val;
        clues.push(`My ${places[idx]} digit is ${k} times my ${places[refIdx]} digit.`);
        success = true;
      } else if (relType === "moreThan") {
        const refIdx = pick(rng, assignedIdxs);
        const k = randInt(rng, 1, 6);
        const val = digits[refIdx] + k;
        if (val > 9 || (isLeading && val === 0)) continue;
        digits[idx] = val;
        clues.push(`My ${places[idx]} digit is ${k} more than my ${places[refIdx]} digit.`);
        success = true;
      } else if (relType === "lessThan") {
        const refIdx = pick(rng, assignedIdxs);
        const k = randInt(rng, 1, 6);
        const val = digits[refIdx] - k;
        if (val < 0 || (isLeading && val === 0)) continue;
        digits[idx] = val;
        clues.push(`My ${places[idx]} digit is ${k} less than my ${places[refIdx]} digit.`);
        success = true;
      } else if (relType === "sum") {
        const [r1, r2] = shuffle(rng, assignedIdxs).slice(0, 2);
        const val = digits[r1] + digits[r2];
        if (val > 9 || (isLeading && val === 0)) continue;
        digits[idx] = val;
        clues.push(`My ${places[idx]} digit is the sum of my ${places[r1]} and ${places[r2]} digits.`);
        success = true;
      } else if (relType === "diff") {
        const [r1, r2] = shuffle(rng, assignedIdxs).slice(0, 2);
        const val = Math.abs(digits[r1] - digits[r2]);
        if (isLeading && val === 0) continue;
        digits[idx] = val;
        clues.push(`My ${places[idx]} digit is the difference between my ${places[r1]} and ${places[r2]} digits.`);
        success = true;
      } else if (relType === "equal") {
        const refIdx = pick(rng, assignedIdxs);
        const val = digits[refIdx];
        if (isLeading && val === 0) continue;
        digits[idx] = val;
        clues.push(`My ${places[idx]} digit is the same as my ${places[refIdx]} digit.`);
        success = true;
      }
    }
    if (!success) {
      const val = randInt(rng, isLeading ? 1 : 0, 9);
      digits[idx] = val;
      clues.push(`My ${places[idx]} digit is ${val}.`);
    }
  }
  return { digits, clues };
}

function genRiddle(rng, tier) {
  const length = tier <= 2 ? 4 : tier <= 4 ? 5 : 6;
  const { digits, clues } = buildRiddle(rng, length);
  const target = parseInt(digits.join(""), 10);
  const prompt = `I am a ${length}-digit number.\n${clues.join("\n")}\nWhat number am I?`;
  const distractors = new Set();
  let guard = 0;
  while (distractors.size < 3 && guard < 60) {
    guard++;
    const mutated = digits.slice();
    const numMutations = randInt(rng, 1, 2);
    for (let m = 0; m < numMutations; m++) {
      const pos = randInt(rng, 0, length - 1);
      mutated[pos] = randInt(rng, pos === 0 ? 1 : 0, 9);
    }
    if (mutated[0] === 0) continue;
    const val = parseInt(mutated.join(""), 10);
    if (val !== target) distractors.add(val);
  }
  return { prompt, correct: target, distractors: [...distractors] };
}

function genIndianVsIntl(rng, tier) {
  const ranges = [[100000, 999999], [100000, 999999], [1000000, 9999999], [1000000, 9999999], [10000000, 99999999]];
  const [lo, hi] = ranges[tier - 1];
  const n = randInt(rng, lo, hi);
  const askIndian = rng() > 0.5;
  const correct = askIndian ? numberToWordsIndian(n) : numberToWordsInternational(n);
  const cross = askIndian ? numberToWordsInternational(n) : numberToWordsIndian(n);
  const distractorVals = new Set();
  let guard = 0;
  while (distractorVals.size < 2 && guard < 30) {
    guard++;
    const bump = pick(rng, [1, 2, 3, 5, 10, 20, 50]) * Math.pow(10, randInt(rng, 2, 5));
    let m = rng() > 0.5 ? n + bump : n - bump;
    if (m <= 0) m = n + bump;
    m = Math.floor(m);
    if (m !== n) distractorVals.add(m);
  }
  const distractorWords = [...distractorVals].map((m) => (askIndian ? numberToWordsIndian(m) : numberToWordsInternational(m)));
  const systemName = askIndian ? "Indian" : "International";
  return {
    prompt: `What is ${n} called in the ${systemName} number system?`,
    correct,
    distractors: [cross, ...distractorWords],
  };
}

function genCommaFormat(rng, tier) {
  const ranges = [[100000, 999999], [100000, 999999], [1000000, 9999999], [1000000, 9999999], [10000000, 99999999]];
  const [lo, hi] = ranges[tier - 1];
  const n = randInt(rng, lo, hi);
  const askIndianFormat = rng() > 0.5;
  const numStr = String(n);
  const correct = askIndianFormat ? indianCommaFormat(numStr) : intlCommaFormat(numStr);
  const cross = askIndianFormat ? intlCommaFormat(numStr) : indianCommaFormat(numStr);
  function misgroup(s) {
    const positions = new Set();
    let guard = 0;
    const count = randInt(rng, 1, 2);
    while (positions.size < count && guard < 10) { positions.add(randInt(rng, 1, s.length - 1)); guard++; }
    const arr = s.split("");
    [...positions].sort((a, b) => b - a).forEach((p) => arr.splice(p, 0, ","));
    return arr.join("");
  }
  const distractorsSet = new Set();
  let guard = 0;
  while (distractorsSet.size < 2 && guard < 20) {
    guard++;
    const d = misgroup(numStr);
    if (d !== correct && d !== cross) distractorsSet.add(d);
  }
  const systemName = askIndianFormat ? "Indian" : "International";
  return {
    prompt: `Which shows the number ${numStr} written with correct comma placement in the ${systemName} number system?`,
    correct,
    distractors: [cross, ...distractorsSet],
  };
}

function genPlaceValueDiff(rng, tier) {
  const length = tier <= 2 ? 5 : tier <= 4 ? 6 : 7;
  const placeNames = PLACE_NAMES(length);
  let digits = randomDigits(rng, length);
  const useRepeated = rng() < 0.35;
  let posA, posB, valA, valB;
  if (useRepeated) {
    posA = randInt(rng, 0, length - 1);
    posB = randInt(rng, 0, length - 1);
    while (posB === posA) posB = randInt(rng, 0, length - 1);
    const val = randInt(rng, 1, 9);
    digits[posA] = val; digits[posB] = val;
    for (let i = 0; i < length; i++) {
      if (i !== posA && i !== posB && digits[i] === val) {
        digits[i] = (val + 1) % 10;
        if (i === 0 && digits[i] === 0) digits[i] = 1;
      }
    }
    valA = val; valB = val;
  } else {
    posA = randInt(rng, 0, length - 1);
    posB = randInt(rng, 0, length - 1);
    while (posB === posA) posB = randInt(rng, 0, length - 1);
    valA = digits[posA]; valB = digits[posB];
  }
  const placeValA = valA * Math.pow(10, length - 1 - posA);
  const placeValB = valB * Math.pow(10, length - 1 - posB);
  const diff = Math.abs(placeValA - placeValB);
  const displayNum = intlCommaFormat(digits.join(""));
  let prompt;
  if (useRepeated) {
    prompt = `In the number ${displayNum}, find the difference between the place values of the two ${valA}s.`;
  } else {
    prompt = `In the number ${displayNum}, what is the difference between the place value of the digit in the ${placeNames[posA]} place and the digit in the ${placeNames[posB]} place?`;
  }
  const scale = Math.max(10, Math.round(diff / 4) || 10);
  return { prompt, correct: diff, distractors: [Math.abs(valA - valB), placeValA, placeValB, ...numDistractors(rng, diff, scale)] };
}

function genRounding(rng, tier) {
  const roundExponent = [3, 4, 5, 5, 6][tier - 1];
  const numLength = roundExponent + randInt(rng, 1, 2);
  const digits = randomDigits(rng, numLength);
  const n = parseInt(digits.join(""), 10);
  const factor = Math.pow(10, roundExponent);
  const rounded = Math.round(n / factor) * factor;
  const labelMap = { 3: "thousand", 4: "ten thousand", 5: "hundred thousand", 6: "million" };
  const distractorsSet = new Set([rounded + factor, Math.max(0, rounded - factor), n, rounded + 2 * factor]);
  distractorsSet.delete(rounded);
  return {
    prompt: `Round ${intlCommaFormat(String(n))} to the nearest ${labelMap[roundExponent]}.`,
    correct: rounded,
    distractors: [...distractorsSet],
  };
}

function genPlaceValueJump(rng, tier) {
  const expPools = [[2, 3], [3, 4], [4, 5], [5], [5, 6]];
  const exponent = pick(rng, expPools[tier - 1]);
  const jumpAmount = pick(rng, [1, 2, 3, 5]) * Math.pow(10, exponent);
  const baseLength = Math.min(8, exponent + randInt(rng, 2, 3));
  const digits = randomDigits(rng, baseLength);
  const n = parseInt(digits.join(""), 10);
  const goingUp = rng() > 0.5;
  const correct = goingUp ? n + jumpAmount : Math.max(0, n - jumpAmount);
  const wrongPlaceMistake = goingUp ? n + jumpAmount * 10 : Math.max(0, n - jumpAmount * 10);
  return {
    prompt: `What number is ${jumpAmount.toLocaleString()} ${goingUp ? "more" : "less"} than ${n.toLocaleString()}?`,
    correct,
    distractors: [wrongPlaceMistake, n, ...numDistractors(rng, correct, Math.max(10, jumpAmount / 2))],
  };
}

function genDigitArrangement(rng, tier) {
  const length = tier <= 2 ? 4 : tier <= 4 ? 5 : 6;
  const digits = shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, length);
  const askGreatest = rng() > 0.5;
  const greatestArr = [...digits].sort((a, b) => b - a);
  let ascendingArr = [...digits].sort((a, b) => a - b);
  if (ascendingArr[0] === 0) {
    const idx = ascendingArr.findIndex((d) => d !== 0);
    [ascendingArr[0], ascendingArr[idx]] = [ascendingArr[idx], ascendingArr[0]];
  }
  const greatestNum = greatestArr.join("");
  const smallestNum = ascendingArr.join("");
  const correct = askGreatest ? greatestNum : smallestNum;
  const otherExtreme = askGreatest ? smallestNum : greatestNum;
  const shuffledOrder = shuffle(rng, digits).join("");
  function swapTwo(str) {
    const arr = str.split("");
    const i = randInt(rng, 0, arr.length - 2);
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    return arr.join("");
  }
  return {
    prompt: `Using the digits ${digits.join(", ")} (each exactly once), what is the ${askGreatest ? "greatest" : "smallest"} possible ${length}-digit number you can form?`,
    correct,
    distractors: [otherExtreme, shuffledOrder, swapTwo(correct)],
  };
}

function genAdvancedPattern(rng, tier) {
  const pools = [
    ["arithmetic", "squares", "doubling"],
    ["arithmetic", "squares", "doubling"],
    ["arithmetic", "squares", "doubling", "triangular", "increasingStep"],
    ["triangular", "increasingStep", "doubling", "squares"],
    ["fibonacci", "increasingStep", "doubling", "triangular"],
  ];
  const type = pick(rng, pools[tier - 1]);
  let seq, next;
  if (type === "arithmetic") {
    const stepPool = [[2, 3, 4, 5, 10, 25], [5, 10, 15, 20, 25, 50], [10, 25, 50, 75, 100], [50, 100, 250, 500], [100, 250, 500, 1000]][tier - 1];
    const step = pick(rng, stepPool);
    const start = randInt(rng, 1, 100) * (tier >= 4 ? 10 : 1);
    seq = [start, start + step, start + 2 * step, start + 3 * step];
    next = start + 4 * step;
  } else if (type === "squares") {
    const k = randInt(rng, 1, tier <= 2 ? 6 : 10);
    seq = [k * k, (k + 1) * (k + 1), (k + 2) * (k + 2), (k + 3) * (k + 3)];
    next = (k + 4) * (k + 4);
  } else if (type === "triangular") {
    const T = (m) => (m * (m + 1)) / 2;
    const k = randInt(rng, 1, tier <= 3 ? 6 : 10);
    seq = [T(k), T(k + 1), T(k + 2), T(k + 3)];
    next = T(k + 4);
  } else if (type === "doubling") {
    const start = randInt(rng, 1, tier <= 2 ? 9 : 25);
    seq = [start, start * 2, start * 4, start * 8];
    next = start * 16;
  } else if (type === "fibonacci") {
    const a = randInt(rng, 1, 9), b = randInt(rng, a + 1, a + 9);
    const c = a + b, d = b + c;
    seq = [a, b, c, d];
    next = c + d;
  } else {
    const start = randInt(rng, 1, 20) * (tier >= 4 ? 5 : 1);
    let d = randInt(rng, 2, 9), inc = randInt(rng, 2, 6) * (tier >= 4 ? 2 : 1);
    seq = [start];
    for (let i = 1; i < 4; i++) { seq.push(seq[i - 1] + d); d += inc; }
    next = seq[3] + d;
  }
  const lastDiff = Math.max(2, Math.abs(seq[3] - seq[2]));
  return { prompt: `What number comes next in the pattern?\n${seq.join(", ")}, ?`, correct: next, distractors: numDistractors(rng, next, lastDiff) };
}

function genNumeration(rng, tier) {
  const variant = pick(rng, ["riddle", "riddle", "indianIntl", "commaFormat", "placeValueDiff", "placeValueDiff", "rounding", "jump", "digitArrange", "pattern"]);
  if (variant === "riddle") return genRiddle(rng, tier);
  if (variant === "indianIntl") return genIndianVsIntl(rng, tier);
  if (variant === "commaFormat") return genCommaFormat(rng, tier);
  if (variant === "placeValueDiff") return genPlaceValueDiff(rng, tier);
  if (variant === "rounding") return genRounding(rng, tier);
  if (variant === "jump") return genPlaceValueJump(rng, tier);
  if (variant === "digitArrange") return genDigitArrangement(rng, tier);
  return genAdvancedPattern(rng, tier);
}

/* ============================================================
   ADDITION — large-number column addition, decimal alignment
   (money/distance/weight), and missing-addend equations
   ============================================================ */
function noCarrySum(nums) {
  const maxLen = Math.max(...nums.map((n) => String(n).length));
  const strs = nums.map((n) => String(n).padStart(maxLen, "0"));
  let resultDigits = [];
  for (let pos = maxLen - 1; pos >= 0; pos--) {
    let s = 0;
    for (const str of strs) s += Number(str[pos]);
    resultDigits.unshift(s % 10);
  }
  return parseInt(resultDigits.join(""), 10);
}
function genLargeAddition(rng, tier) {
  const ranges = [[1000, 50000], [10000, 200000], [50000, 600000], [100000, 999999], [500000, 9999999]];
  const [lo, hi] = ranges[tier - 1];
  const numAddends = tier <= 3 ? 2 : (rng() > 0.5 ? 3 : 2);
  const addends = [];
  for (let i = 0; i < numAddends; i++) addends.push(randInt(rng, lo, hi));
  const correct = addends.reduce((s, v) => s + v, 0);
  const prompt = `${addends.map((n) => n.toLocaleString()).join(" + ")} = ?`;
  const noCarry = noCarrySum(addends);
  const scale = Math.max(100, Math.round(correct * 0.01));
  return { prompt, correct, distractors: [noCarry, ...numDistractors(rng, correct, scale)] };
}

function genDecimalAddition(rng, tier) {
  const wholeRanges = [[1, 30], [1, 100], [10, 300], [10, 1000], [100, 3000]];
  const [wlo, whi] = wholeRanges[tier - 1];
  const placesPool = tier <= 1 ? [1, 2] : tier <= 3 ? [1, 2, 2, 3] : [2, 3, 3];
  function makeNum() {
    const whole = randInt(rng, wlo, whi);
    const places = pick(rng, placesPool);
    const digits = [];
    for (let i = 0; i < places; i++) digits.push(randInt(rng, 0, 9));
    const fracStr = digits.join("");
    const value = parseFloat(`${whole}.${fracStr}`);
    return { value, places, whole, fracStr };
  }
  let A = makeNum();
  let B = makeNum();
  if (tier >= 2 && A.places === B.places && rng() > 0.35) {
    const alt = placesPool.filter((p) => p !== A.places);
    const newPlaces = alt.length ? pick(rng, alt) : (A.places === 3 ? 2 : 3);
    const whole = randInt(rng, wlo, whi);
    const digits = [];
    for (let i = 0; i < newPlaces; i++) digits.push(randInt(rng, 0, 9));
    B = { value: parseFloat(`${whole}.${digits.join("")}`), places: newPlaces, whole, fracStr: digits.join("") };
  }
  const correct = Math.round((A.value + B.value) * 1000) / 1000;
  const context = pick(rng, ["money", "distance", "weight"]);
  const fmt = (num) => (context === "money" ? `$${num.value.toFixed(num.places)}` : `${num.value.toFixed(num.places)} ${context === "distance" ? "km" : "kg"}`);
  const prompt = `${fmt(A)} + ${fmt(B)} = ?`;

  const dispPlaces = Math.max(A.places, B.places, 2);
  const correctDisp = correct.toFixed(dispPlaces);
  const candidateSet = new Set();
  function tryAdd(numVal) {
    if (numVal == null || numVal < 0 || isNaN(numVal)) return;
    const s = numVal.toFixed(dispPlaces);
    if (s !== correctDisp) candidateSet.add(s);
  }
  const wholeOnly = A.whole + B.whole;
  tryAdd(wholeOnly);
  if (A.places !== B.places) {
    const maxP = Math.max(A.places, B.places);
    const rawSum = parseInt(A.fracStr, 10) + parseInt(B.fracStr, 10);
    const fracCombined = String(rawSum).padStart(maxP, "0");
    tryAdd(A.whole + B.whole + parseFloat("0." + fracCombined));
  }
  const jitterPool = [0.1, -0.1, 0.01, -0.01, 1, -1, 0.001, -0.001, 0.5, -0.5, 2, -2, 5, -5, 0.05, -0.05];
  let guard = 0;
  while (candidateSet.size < 3 && guard < 80) {
    guard++;
    tryAdd(Math.round((correct + pick(rng, jitterPool)) * 1000) / 1000);
  }
  return { prompt, correct: correctDisp, distractors: [...candidateSet].slice(0, 3) };
}

function genEquationSolving(rng, tier) {
  const ranges = [[10, 100], [50, 500], [100, 2000], [500, 9000], [1000, 50000]];
  const [lo, hi] = ranges[tier - 1];

  if (tier >= 4 && rng() > 0.5) {
    const a = randInt(rng, lo, hi), b = randInt(rng, lo, hi), e = randInt(rng, lo, hi);
    const c = a + b + e;
    const which = pick(rng, [0, 1, 2]);
    const vals = [a, b, e];
    const missing = vals[which];
    const parts = vals.map((v, i) => (i === which ? "___" : v.toLocaleString()));
    return {
      prompt: `Find the missing number:\n${parts.join(" + ")} = ${c.toLocaleString()}`,
      correct: missing,
      distractors: [c, ...vals.filter((_, i) => i !== which), ...numDistractors(rng, missing, Math.max(5, Math.round(missing / 3)))],
    };
  }

  const a = randInt(rng, lo, hi);
  const b = randInt(rng, lo, hi);
  const c = a + b;
  const missingFirst = rng() > 0.5;
  const missing = missingFirst ? a : b;
  const known = missingFirst ? b : a;
  const promptStr = missingFirst ? `___ + ${known.toLocaleString()} = ${c.toLocaleString()}` : `${known.toLocaleString()} + ___ = ${c.toLocaleString()}`;
  return {
    prompt: `Find the missing number:\n${promptStr}`,
    correct: missing,
    distractors: [c, known, ...numDistractors(rng, missing, Math.max(5, Math.round(missing / 3)))],
  };
}

function genAddition(rng, tier) {
  const variant = pick(rng, ["large", "decimal", "equation"]);
  if (variant === "large") return genLargeAddition(rng, tier);
  if (variant === "decimal") return genDecimalAddition(rng, tier);
  return genEquationSolving(rng, tier);
}

function genSubtraction(rng, grade) {
  const ranges = [[1, 10], [1, 50], [10, 200], [100, 2000], [500, 9000]];
  const [lo, hi] = gradeRange(grade, ranges);
  const a = randInt(rng, lo, hi);
  const b = randInt(rng, 0, a);
  const correct = a - b;
  return { prompt: `${a} - ${b} = ?`, correct, distractors: numDistractors(rng, correct, Math.max(1, Math.round(b / 2))) };
}

function genMultiplication(rng, grade) {
  let a, b;
  if (grade === 1) { a = randInt(rng, 1, 5); b = randInt(rng, 1, 5); }
  else if (grade === 2) { a = randInt(rng, 1, 10); b = randInt(rng, 1, 10); }
  else if (grade === 3) { a = randInt(rng, 2, 12); b = randInt(rng, 2, 12); }
  else if (grade === 4) { a = randInt(rng, 11, 30); b = randInt(rng, 2, 9); }
  else { a = randInt(rng, 11, 25); b = randInt(rng, 11, 20); }
  const correct = a * b;
  const distractors = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, correct + a, correct - b];
  return { prompt: `${a} × ${b} = ?`, correct, distractors };
}

const NICE_ROMANS = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20],
  2: [1, 4, 5, 9, 10, 14, 19, 20, 24, 29, 30, 40, 44, 49, 50],
  3: [10, 14, 19, 24, 29, 40, 44, 49, 59, 60, 69, 74, 89, 90, 99],
  4: [40, 49, 90, 99, 140, 149, 190, 199, 240, 290, 340, 390, 440, 490, 540],
  5: [90, 140, 190, 240, 290, 340, 400, 440, 490, 540, 640, 740, 840, 900, 990],
};
function genRoman(rng, grade) {
  const pool = NICE_ROMANS[Math.min(grade, 5)];
  const n = pick(rng, pool);
  const roman = toRoman(n);
  if (rng() > 0.5) {
    const distractorNums = numDistractors(rng, n, grade <= 2 ? 1 : 5).filter((d) => d > 0 && d < 4000);
    return { prompt: `What is ${roman} in numbers?`, correct: n, distractors: distractorNums };
  } else {
    const distractorPool = pool.filter((x) => x !== n);
    const distractorRomans = shuffle(rng, distractorPool).slice(0, 5).map(toRoman);
    return { prompt: `What is ${n} in Roman numerals?`, correct: roman, distractors: distractorRomans };
  }
}

function genAreaPerimeter(rng, grade) {
  const maxSide = [6, 8, 10, 15, 20][Math.min(grade, 5) - 1];
  const isSquare = rng() > 0.6;
  const l = randInt(rng, 2, maxSide);
  const w = isSquare ? l : randInt(rng, 2, maxSide);
  const shapeDesc = isSquare ? `a square with side ${l} cm` : `a rectangle with length ${l} cm and width ${w} cm`;
  const askArea = rng() > 0.5;
  const area = l * w;
  const perimeter = 2 * (l + w);
  if (askArea) {
    return {
      prompt: `What is the area of ${shapeDesc}?`,
      correct: `${area} cm²`,
      distractors: [`${perimeter} cm²`, `${l + w} cm²`, `${area + l} cm²`, `${l * (w + 1)} cm²`],
    };
  }
  return {
    prompt: `What is the perimeter of ${shapeDesc}?`,
    correct: `${perimeter} cm`,
    distractors: [`${area} cm`, `${l + w} cm`, `${perimeter + 2} cm`, `${perimeter - 2} cm`],
  };
}

/* ============================================================
   FRACTIONS — comprehensive question set across 8 concepts
   ============================================================ */
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function lcm(a, b) { return (a * b) / gcd(a, b); }
function simplify(n, d) { const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }
function fracStr(n, d) { return `${n}/${d}`; }
function mixedStr(whole, n, d) { return `${whole} ${n}/${d}`; }

function genProperVsImproper(rng, tier) {
  const askProper = rng() > 0.5;
  const denoms = tier === 1 ? [2,3,4,5] : [3,4,5,6,7,8,9,10,12];
  const makeProper   = () => { const d = pick(rng, denoms); return fracStr(randInt(rng, 1, d - 1), d); };
  const makeImproper = () => { const d = pick(rng, denoms); return fracStr(randInt(rng, d + 1, d * 2), d); };
  const makeUnit     = () => { const d = pick(rng, denoms); return fracStr(d, d); };
  const target = askProper ? makeProper() : makeImproper();
  const distractors = [
    askProper ? makeImproper() : makeProper(),
    askProper ? makeImproper() : makeProper(),
    makeUnit(),
  ];
  return {
    prompt: `Which of the following is a ${askProper ? "proper" : "improper"} fraction?`,
    correct: target,
    distractors,
  };
}

function genCompareSameDenom(rng, tier) {
  const denoms = tier <= 2 ? [4,5,6,8] : [6,7,8,9,10,12,15];
  const d = pick(rng, denoms);
  const cap = tier >= 2 ? d + d : d;
  let n1 = randInt(rng, 1, cap), n2 = randInt(rng, 1, cap);
  while (n1 === n2) n2 = randInt(rng, 1, cap);
  const [f1, f2] = [fracStr(n1, d), fracStr(n2, d)];
  const askGreater = rng() > 0.5;
  const correct = askGreater ? (n1 > n2 ? f1 : f2) : (n1 < n2 ? f1 : f2);
  const wrong   = askGreater ? (n1 > n2 ? f2 : f1) : (n1 < n2 ? f2 : f1);
  return {
    prompt: `Which fraction is ${askGreater ? "greater" : "smaller"}?\n${f1}  or  ${f2}`,
    correct,
    distractors: [wrong, "They are equal", fracStr(n1 + n2, d)],
  };
}

function genCompareDiffDenom(rng, tier) {
  const pairs = [
    [1,2,1,3],[1,2,1,4],[2,3,3,4],[1,3,1,4],[3,4,2,3],
    [1,2,3,8],[2,5,3,10],[1,3,2,9],[4,5,3,4],[5,6,7,8],
    [3,4,5,7],[2,3,5,8],[5,9,4,7],[7,10,2,3],[3,5,4,7],
  ];
  const [n1, d1, n2, d2] = pick(rng, pairs);
  const v1 = n1 / d1, v2 = n2 / d2;
  const f1 = fracStr(n1, d1), f2 = fracStr(n2, d2);
  const askGreater = rng() > 0.5;
  const correct = askGreater ? (v1 > v2 ? f1 : f2) : (v1 < v2 ? f1 : f2);
  const wrong   = askGreater ? (v1 > v2 ? f2 : f1) : (v1 < v2 ? f2 : f1);
  return {
    prompt: `Which fraction is ${askGreater ? "greater" : "smaller"}?\n${f1}  or  ${f2}`,
    correct,
    distractors: [wrong, fracStr(n1 + n2, d1 + d2), "They are equal"],
  };
}

function genSameDenomAddSub(rng, tier) {
  const denoms = tier <= 2 ? [4,5,6,8] : [6,7,8,9,10,12];
  const d = pick(rng, denoms);
  const doSub = tier >= 3 && rng() > 0.5;
  let n1 = randInt(rng, 1, tier <= 2 ? d - 1 : d + 2);
  let n2 = randInt(rng, 1, tier <= 2 ? d - 1 : d);
  if (doSub && n2 > n1) [n1, n2] = [n2, n1];
  const rawNum = doSub ? n1 - n2 : n1 + n2;
  const [sn, sd] = simplify(rawNum, d);
  const correctStr = sd === 1 ? String(sn) : fracStr(sn, sd);
  const noSimplify = (rawNum !== sn || d !== sd) ? fracStr(rawNum, d) : fracStr(rawNum + 1, d);
  const offNum = sd === 1 ? String(sn + 1) : fracStr(sn + 1, sd);
  return {
    prompt: `${fracStr(n1, d)} ${doSub ? "−" : "+"} ${fracStr(n2, d)} = ?`,
    correct: correctStr,
    distractors: [noSimplify, fracStr(sn, sd === 1 ? d : sd * 2), offNum],
  };
}

function genDiffDenomAddSub(rng, tier) {
  const combos = [
    [1,2,1,3],[1,3,1,4],[1,2,1,4],[2,3,1,4],[1,2,1,6],
    [3,4,1,8],[1,3,2,9],[2,5,1,10],[1,4,1,6],[3,8,1,4],
    [2,3,1,6],[5,6,1,4],[1,2,2,5],[3,4,1,3],[2,7,1,14],
  ];
  const doSub = tier >= 4 && rng() > 0.5;
  const [n1, d1, n2, d2] = pick(rng, combos);
  const lcd = lcm(d1, d2);
  const eq1 = (n1 * lcd) / d1, eq2 = (n2 * lcd) / d2;
  const rawNum = doSub ? Math.abs(eq1 - eq2) : eq1 + eq2;
  if (rawNum <= 0) return genDiffDenomAddSub(rng, tier);
  const [sn, sd] = simplify(rawNum, lcd);
  const correctStr = sd === 1 ? String(sn) : fracStr(sn, sd);
  const noSimp = (rawNum !== sn || lcd !== sd) ? fracStr(rawNum, lcd) : fracStr(rawNum, lcd + 1);
  return {
    prompt: `${fracStr(n1, d1)} ${doSub ? "−" : "+"} ${fracStr(n2, d2)} = ?`,
    correct: correctStr,
    distractors: [fracStr(n1 + n2, d1 + d2), noSimp, fracStr(sn, sd === 1 ? lcd : Math.max(1, sd - 1))],
  };
}

function genReduce(rng, tier) {
  const baseNums = [[1,2],[1,3],[2,3],[1,4],[3,4],[2,5],[3,5],[4,5],[1,6],[5,6],[3,8],[5,8],[7,8]];
  const mult = tier <= 2 ? pick(rng, [2,3,4]) : pick(rng, [3,4,5,6,7,8]);
  const [bn, bd] = pick(rng, baseNums);
  const n = bn * mult, d = bd * mult;
  const [sn, sd] = simplify(n, d);
  const correct = fracStr(sn, sd);
  const halfG = Math.max(1, Math.floor(gcd(n, d) / 2));
  const partial = halfG > 1 ? fracStr(n / halfG, d / halfG) : fracStr(n, d - 1);
  return {
    prompt: `Reduce ${fracStr(n, d)} to its lowest terms.`,
    correct,
    distractors: [fracStr(n, d), partial, fracStr(sd, sn), fracStr(sn, sd + 1)],
  };
}

function genMixedToImproper(rng, tier) {
  const denoms = tier <= 3 ? [2,3,4,5,6] : [5,6,7,8,9,10,12];
  const d = pick(rng, denoms);
  const whole = randInt(rng, 1, tier <= 3 ? 4 : 9);
  const n = randInt(rng, 1, d - 1);
  const improperN = whole * d + n;
  const toImproper = rng() > 0.5;
  if (toImproper) {
    return {
      prompt: `Convert ${mixedStr(whole, n, d)} to an improper fraction.`,
      correct: fracStr(improperN, d),
      distractors: [fracStr(whole * n + d, d), fracStr(improperN + 1, d), fracStr(improperN, d + 1), fracStr(whole + n, d)],
    };
  }
  return {
    prompt: `Convert ${fracStr(improperN, d)} to a mixed number.`,
    correct: mixedStr(whole, n, d),
    distractors: [mixedStr(whole + 1, n, d), mixedStr(whole, n + 1, d), mixedStr(whole - 1 > 0 ? whole - 1 : whole + 2, n, d), `${improperN} ${n}/${d}`],
  };
}

function genFractionOfWhole(rng, tier) {
  const contexts = ["students in a class","marbles in a bag","pages in a book","stickers on a sheet","apples in a basket","crayons in a box","coins in a jar","candies in a bag"];
  const denoms = tier <= 2 ? [2,3,4,5] : tier <= 4 ? [4,5,6,8,10] : [6,8,9,10,12];
  const d = pick(rng, denoms);
  const n = randInt(rng, 1, d - 1);
  const maxWhole = tier <= 2 ? 30 : 100;
  const multiples = [1,2,3,4,5,6,7,8,9,10].map(m => m * d).filter(m => m <= maxWhole);
  const whole = pick(rng, multiples);
  const correct = (whole / d) * n;
  return {
    prompt: `There are ${whole} ${pick(rng, contexts)}.\nWhat is ${fracStr(n, d)} of ${whole}?`,
    correct,
    distractors: [(whole / d) * (n + 1), whole * n, whole - correct, correct + d].filter(v => v !== correct && v >= 0),
  };
}

function genFractions(rng, tier) {
  const pools = {
    1: ["properVsImproper","compareSame","sameDenomAdd","fractionOfWhole","properVsImproper","compareSame"],
    2: ["compareSame","sameDenomAdd","reduce","properVsImproper","fractionOfWhole","mixedConvert"],
    3: ["compareDiff","sameDenomAdd","reduce","mixedConvert","fractionOfWhole","compareSame"],
    4: ["diffDenomAdd","compareDiff","reduce","mixedConvert","sameDenomAdd","diffDenomAdd"],
    5: ["diffDenomAdd","mixedConvert","reduce","compareDiff","diffDenomAdd","mixedConvert"],
  };
  const variant = pick(rng, pools[tier] || pools[3]);
  if (variant === "properVsImproper") return genProperVsImproper(rng, tier);
  if (variant === "compareSame")      return genCompareSameDenom(rng, tier);
  if (variant === "compareDiff")      return genCompareDiffDenom(rng, tier);
  if (variant === "sameDenomAdd")     return genSameDenomAddSub(rng, tier);
  if (variant === "diffDenomAdd")     return genDiffDenomAddSub(rng, tier);
  if (variant === "reduce")           return genReduce(rng, tier);
  if (variant === "mixedConvert")     return genMixedToImproper(rng, tier);
  if (variant === "fractionOfWhole")  return genFractionOfWhole(rng, tier);
  return genCompareSameDenom(rng, tier);
}

function genDecimals(rng, grade) {
  if (grade <= 3) {
    const a = (randInt(rng, 1, 99) / 10).toFixed(1);
    let b = (randInt(rng, 1, 99) / 10).toFixed(1);
    while (b === a) b = (randInt(rng, 1, 99) / 10).toFixed(1);
    const greater = parseFloat(a) > parseFloat(b) ? a : b;
    const smaller = greater === a ? b : a;
    return { prompt: `Which decimal is greater?`, correct: greater, distractors: [smaller, "They are equal", "Cannot tell"] };
  }
  if (grade === 4) {
    const whole = randInt(rng, 1, 9);
    const dec = randInt(rng, 1, 9);
    const hundredth = randInt(rng, 0, 9);
    const n = `${whole}.${dec}${hundredth}`;
    const pos = randInt(rng, 0, 1);
    const digit = pos === 0 ? dec : hundredth;
    const value = pos === 0 ? (digit / 10).toFixed(1) : (digit / 100).toFixed(2);
    const otherValue = pos === 0 ? (digit / 100).toFixed(2) : (digit / 10).toFixed(1);
    return {
      prompt: `What is the value of the digit ${digit} in ${n}?`,
      correct: value,
      distractors: [otherValue, String(digit), String(digit * 10), String(digit * 100)],
    };
  }
  if (rng() > 0.5) {
    const a = (randInt(rng, 1, 50) / 10).toFixed(1);
    const b = (randInt(rng, 1, 50) / 10).toFixed(1);
    const correct = (parseFloat(a) + parseFloat(b)).toFixed(1);
    return { prompt: `${a} + ${b} = ?`, correct, distractors: numDistractors(rng, parseFloat(correct), 1).map((v) => v.toFixed(1)) };
  }
  const pairs = [[1, 2, "0.5"], [1, 4, "0.25"], [3, 4, "0.75"], [1, 5, "0.2"], [1, 10, "0.1"], [3, 10, "0.3"], [7, 10, "0.7"], [1, 100, "0.01"]];
  const [n, d, correct] = pick(rng, pairs);
  const others = pairs.filter((p) => p[2] !== correct).map((p) => p[2]);
  return { prompt: `What is ${n}/${d} as a decimal?`, correct, distractors: shuffle(rng, others).slice(0, 5) };
}

/* ============================================================
   ANGLES — application-oriented, 7 question families:
   angle-type reasoning, clock angles, capital letters,
   complementary/supplementary, turns & compass, angles in
   shapes, and real-world contexts
   ============================================================ */
function angleType(deg) {
  if (deg === 0) return "zero";
  if (deg < 90) return "acute";
  if (deg === 90) return "right";
  if (deg < 180) return "obtuse";
  if (deg === 180) return "straight";
  if (deg < 360) return "reflex";
  return "full";
}

function genAngleType(rng, tier) {
  const templates = [
    () => {
      const base = pick(rng, [90, 180, 360]);
      const frac = pick(rng, [[1,2,"half"],[1,4,"a quarter of"],[3,4,"three-quarters of"],[1,3,"one-third of"],[2,3,"two-thirds of"]]);
      const deg = Math.round(base * frac[0] / frac[1]);
      const type = angleType(deg);
      return {
        prompt: `An angle is ${frac[2]} a ${base === 90 ? "right" : base === 180 ? "straight" : "full"} angle.\nWhat is its measure, and what type of angle is it?`,
        correct: `${deg}° — ${type}`,
        distractors: [`${deg}° — ${type === "acute" ? "obtuse" : "acute"}`, `${deg + 10}° — ${angleType(deg + 10)}`, `${deg}° — right`, `${Math.round(base / 2)}° — straight`],
      };
    },
    () => {
      const base = pick(rng, [30, 45, 60]);
      const mult = pick(rng, [2, 3]);
      const deg = base * mult;
      const type = angleType(deg);
      return {
        prompt: `An angle is ${mult === 2 ? "double" : "triple"} the size of a ${base}° angle.\nWhat type of angle is it?`,
        correct: type,
        distractors: ["acute","obtuse","right","straight"].filter(t => t !== type),
      };
    },
    () => {
      const a = pick(rng, [90, 120, 150, 180]);
      const b = pick(rng, [20, 30, 45, 60]);
      const deg = a - b;
      return {
        prompt: `What is the difference between a ${a}° angle and a ${b}° angle?\nWhat type of angle is the result?`,
        correct: `${deg}° — ${angleType(deg)}`,
        distractors: [`${deg}° — ${angleType(deg) === "acute" ? "obtuse" : "acute"}`, `${a + b}° — ${angleType(a + b)}`, `${deg + 10}° — ${angleType(deg + 10)}`],
      };
    },
  ];
  return pick(rng, templates)();
}

function genClockAngle(rng, tier) {
  function clockAngleFn(h, m) {
    const hourAngle = (h % 12) * 30 + m * 0.5;
    const minAngle  = m * 6;
    const diff = Math.abs(hourAngle - minAngle);
    return Math.round(Math.min(diff, 360 - diff));
  }
  function clockStr(h, m) { return m === 0 ? `${h} o'clock` : `${h}:${String(m).padStart(2,"0")}`; }

  const wholeHours = [[3,0],[6,0],[9,0],[12,0],[1,0],[2,0],[4,0],[5,0],[7,0],[8,0],[10,0],[11,0]];
  const halfHours  = [[3,30],[6,30],[9,30],[12,30],[3,15],[6,15],[9,15],[12,15]];
  const fiveMin    = [[2,30],[4,30],[7,30],[8,15],[10,20],[11,15],[5,30],[1,30],[10,30]];
  const pool = tier <= 2 ? wholeHours : tier <= 4 ? [...wholeHours, ...halfHours] : [...wholeHours, ...halfHours, ...fiveMin];

  const [h, m] = pick(rng, pool);
  const angle = clockAngleFn(h, m);
  const type  = angleType(angle);
  const timeStr = clockStr(h, m);

  const variant = pick(rng, tier <= 2 ? ["whatAngle","whatType"] : ["whatAngle","whatType","isRight"]);
  if (variant === "whatAngle") {
    return {
      prompt: `What is the angle between the hands of a clock at ${timeStr}?`,
      correct: `${angle}°`,
      distractors: [`${angle + 30}°`, `${Math.abs(angle - 30)}°`, `${angle === 0 ? 360 : angle + 10}°`, `${Math.abs(angle - 90)}°`],
    };
  }
  if (variant === "whatType") {
    return {
      prompt: `What type of angle do the clock hands form at ${timeStr}?`,
      correct: type,
      distractors: ["acute","obtuse","right","straight","reflex"].filter(t => t !== type),
    };
  }
  const isRight = angle === 90;
  return {
    prompt: `Do the clock hands form a right angle at ${timeStr}?`,
    correct: isRight ? "Yes — they form a 90° angle" : `No — the angle is ${angle}°`,
    distractors: isRight
      ? [`No — the angle is ${angle + 30}°`, `No — the angle is 180°`, `No — they form a 45° angle`]
      : [`Yes — they form a 90° angle`, `Yes — they form a 45° angle`, `No — the angle is ${angle + 10}°`],
  };
}

function genLetterAngles(rng, tier) {
  const rightLetters = ["E","F","H","L","T"];
  const acuteLetters = ["A","K","M","N","V","W","X","Y","Z"];
  const variant = pick(rng, tier <= 2
    ? ["findRight","findAcute","howMany"]
    : ["findRight","findAcute","howMany","whichType","countRightInLetter"]);

  if (variant === "findRight") {
    return {
      prompt: `Which capital letter of the English alphabet contains a right angle?`,
      correct: pick(rng, rightLetters),
      distractors: shuffle(rng, acuteLetters).slice(0, 3),
    };
  }
  if (variant === "findAcute") {
    return {
      prompt: `Which capital letter of the English alphabet contains an acute angle?`,
      correct: pick(rng, acuteLetters),
      distractors: shuffle(rng, [...rightLetters, "C","D","G","U"]).slice(0, 3),
    };
  }
  if (variant === "howMany") {
    const shapes = [
      { name: "rectangle", count: 4, wrong: [2,3,6] },
      { name: "square", count: 4, wrong: [2,3,6] },
      { name: "capital letter L", count: 1, wrong: [2,3,4] },
      { name: "capital letter T", count: 2, wrong: [1,3,4] },
      { name: "capital letter E", count: 4, wrong: [2,3,6] },
      { name: "capital letter F", count: 2, wrong: [1,3,4] },
      { name: "capital letter H", count: 4, wrong: [2,3,6] },
    ];
    const s = pick(rng, shapes);
    return {
      prompt: `How many right angles does the ${s.name} contain?`,
      correct: s.count,
      distractors: s.wrong,
    };
  }
  if (variant === "whichType") {
    const letterMap = { A:"acute", V:"acute", X:"acute", L:"right", T:"right", E:"right", Z:"acute", M:"acute", N:"acute" };
    const letter = pick(rng, Object.keys(letterMap));
    const type = letterMap[letter];
    return {
      prompt: `What type of angle can you find in the capital letter ${letter}?`,
      correct: type,
      distractors: ["acute","right","obtuse","straight"].filter(t => t !== type),
    };
  }
  const letterCounts = { E:4, F:2, H:4, L:1, T:2 };
  const letter = pick(rng, Object.keys(letterCounts));
  return {
    prompt: `How many right angles are in the capital letter ${letter}?`,
    correct: letterCounts[letter],
    distractors: [1,2,3,4,6].filter(n => n !== letterCounts[letter]).slice(0,3),
  };
}

function genCompSuppAngles(rng, tier) {
  const variant = pick(rng, tier <= 3
    ? ["findComp","findSupp","isComp","isSupp"]
    : ["findComp","findSupp","isComp","isSupp","threeAngles","vertOpposite"]);

  if (variant === "findComp") {
    const a = pick(rng, [15,20,25,30,35,40,45,50,55,60,65,70]);
    const comp = 90 - a;
    return {
      prompt: `Angles A and B are complementary.\nAngle A = ${a}°. What is angle B?`,
      correct: `${comp}°`,
      distractors: [`${180 - a}°`, `${90 + a}°`, `${comp + 10}°`, `${comp - 5}°`],
    };
  }
  if (variant === "findSupp") {
    const a = pick(rng, [20,30,40,50,60,70,80,90,100,110,120,130,140,150]);
    const supp = 180 - a;
    return {
      prompt: `Angles P and Q are supplementary.\nAngle P = ${a}°. What is angle Q?`,
      correct: `${supp}°`,
      distractors: [`${90 - a > 0 ? 90 - a : 45}°`, `${360 - a}°`, `${supp + 15}°`, `${supp - 15}°`],
    };
  }
  if (variant === "isComp") {
    const a = randInt(rng, 10, 80);
    const b = rng() > 0.5 ? 90 - a : randInt(rng, 10, 100);
    const correct = (a + b === 90) ? "Yes, they are complementary" : "No, they are not complementary";
    return {
      prompt: `Two angles measure ${a}° and ${b}°.\nAre they complementary?`,
      correct,
      distractors: [
        (a + b === 90) ? "No, they are not complementary" : "Yes, they are complementary",
        "Yes, they are supplementary",
        "No — they need to add up to 180°",
      ],
    };
  }
  if (variant === "isSupp") {
    const a = randInt(rng, 20, 150);
    const b = rng() > 0.5 ? 180 - a : randInt(rng, 10, 150);
    const correct = (a + b === 180) ? "Yes, they are supplementary" : "No, they are not supplementary";
    return {
      prompt: `Two angles measure ${a}° and ${b}°.\nAre they supplementary?`,
      correct,
      distractors: [
        (a + b === 180) ? "No, they are not supplementary" : "Yes, they are supplementary",
        "Yes, they are complementary",
        "No — they need to add up to 360°",
      ],
    };
  }
  if (variant === "threeAngles") {
    const a = randInt(rng, 20, 80);
    const b = randInt(rng, 20, 180 - a - 20);
    const c = 180 - a - b;
    return {
      prompt: `Three angles on a straight line are ${a}°, ${b}°, and ___.\nFind the missing angle.`,
      correct: `${c}°`,
      distractors: [`${c + 10}°`, `${c - 10}°`, `${360 - a - b}°`, `${90 - a > 0 ? 90 - a : 95}°`],
    };
  }
  const a = pick(rng, [30,40,45,50,55,60,65,70,75,80,120,130,150]);
  return {
    prompt: `Two straight lines cross each other.\nOne angle formed is ${a}°.\nWhat is the angle directly opposite to it?`,
    correct: `${a}°`,
    distractors: [`${180 - a}°`, `${360 - a}°`, `${Math.min(a + 10, 170)}°`, `${Math.max(a - 10, 5)}°`],
  };
}

function genTurns(rng, tier) {
  const variant = pick(rng, tier <= 2
    ? ["turnDegrees","degreesToTurn"]
    : ["turnDegrees","degreesToTurn","compassTurn","multiTurn"]);

  if (variant === "turnDegrees") {
    const turns = [
      { name: "a quarter turn", deg: 90 }, { name: "a half turn", deg: 180 },
      { name: "a three-quarter turn", deg: 270 }, { name: "a full turn", deg: 360 },
      { name: "one and a half turns", deg: 540 },
    ].slice(0, tier <= 2 ? 4 : 5);
    const t = pick(rng, turns);
    return {
      prompt: `How many degrees is ${t.name}?`,
      correct: `${t.deg}°`,
      distractors: [`${t.deg + 90}°`, `${Math.abs(t.deg - 90)}°`, `${Math.floor(t.deg / 2)}°`, `${t.deg * 2}°`],
    };
  }
  if (variant === "degreesToTurn") {
    const turns = [
      { deg: 90, name: "a quarter turn" }, { deg: 180, name: "a half turn" },
      { deg: 270, name: "a three-quarter turn" }, { deg: 360, name: "a full turn" },
    ];
    const t = pick(rng, turns);
    return {
      prompt: `A rotation of ${t.deg}° is the same as:`,
      correct: t.name,
      distractors: turns.filter(x => x.deg !== t.deg).map(x => x.name),
    };
  }
  if (variant === "compassTurn") {
    const dirs = ["North","East","South","West"];
    const starts = randInt(rng, 0, 3);
    const turns90 = pick(rng, [1,2,3]);
    const dir = pick(rng, ["clockwise","anticlockwise"]);
    const end = dir === "clockwise" ? dirs[(starts + turns90) % 4] : dirs[(starts - turns90 + 4) % 4];
    return {
      prompt: `You are facing ${dirs[starts]}.\nYou turn ${turns90 * 90}° ${dir}.\nWhich direction are you now facing?`,
      correct: end,
      distractors: dirs.filter(d => d !== end),
    };
  }
  const firstTurn = pick(rng, [90,180]);
  const secondTurn = pick(rng, [90,180,270]);
  const total = firstTurn + secondTurn;
  const nameMap = {90:"a quarter turn",180:"a half turn",270:"a three-quarter turn",360:"a full turn"};
  const simplified = total >= 360 ? total - 360 : total;
  return {
    prompt: `A dancer spins ${firstTurn}° and then spins another ${secondTurn}°.\nWhat is the total angle turned?`,
    correct: `${total}°`,
    distractors: [`${total + 90}°`, `${simplified}°`, `${firstTurn}°`, `${Math.abs(firstTurn - secondTurn)}°`],
  };
}

function genAnglesInShapes(rng, tier) {
  const variant = pick(rng, tier <= 3
    ? ["triangleMissing","triangleType","rectangleAngles"]
    : ["triangleMissing","triangleType","polygonSum","exteriorAngle","triangleType"]);

  if (variant === "triangleMissing") {
    const a = randInt(rng, 20, 110);
    const b = randInt(rng, 20, 160 - a);
    const c = 180 - a - b;
    return {
      prompt: `A triangle has two angles of ${a}° and ${b}°.\nWhat is the third angle?`,
      correct: `${c}°`,
      distractors: [`${c + 10}°`, `${c - 10}°`, `${180 - a}°`, `${360 - a - b}°`],
    };
  }
  if (variant === "triangleType") {
    const scenarios = [
      { prompt: `A triangle has all three angles equal to 60°. What type of triangle is it?`, correct: "equilateral triangle" },
      () => { const k = pick(rng,[30,45,60]); return { prompt: `A triangle has angles of 90°, ${k}°, and ${180-90-k}°. What type of triangle is it?`, correct: "right-angled triangle" }; },
      () => { const a = pick(rng,[100,110,120]); const b = randInt(rng,20,180-a-10); return { prompt: `A triangle has angles of ${a}°, ${b}°, and ${180-a-b}°. What type of triangle is it?`, correct: "obtuse triangle" }; },
      () => { const a = randInt(rng,40,80); const b = randInt(rng,40,180-a-10); const c=180-a-b; if(c<=0||c>=90) return null; return { prompt: `A triangle has angles of ${a}°, ${b}°, and ${c}°.\nAll angles are less than 90°. What type of triangle is it?`, correct: "acute triangle" }; },
    ];
    let result = null;
    let guard = 0;
    while (!result && guard < 20) {
      guard++;
      const s = pick(rng, scenarios);
      result = typeof s === "function" ? s() : s;
    }
    if (!result) result = { prompt: `A triangle has all three angles equal to 60°. What type of triangle is it?`, correct: "equilateral triangle" };
    return {
      prompt: result.prompt,
      correct: result.correct,
      distractors: ["equilateral triangle","right-angled triangle","obtuse triangle","acute triangle"].filter(t => t !== result.correct),
    };
  }
  if (variant === "rectangleAngles") {
    const shapes = [
      { name: "rectangle", sum: 360, each: 90 },
      { name: "square", sum: 360, each: 90 },
      { name: "equilateral triangle", sum: 180, each: 60 },
    ];
    const s = pick(rng, shapes);
    const askSum = rng() > 0.5;
    if (askSum) {
      return {
        prompt: `What is the sum of all interior angles in a ${s.name}?`,
        correct: `${s.sum}°`,
        distractors: [`${s.sum === 360 ? 180 : 360}°`, `${s.sum + 90}°`, `${s.sum - 90}°`],
      };
    }
    return {
      prompt: `What is the measure of each interior angle in a ${s.name}?`,
      correct: `${s.each}°`,
      distractors: [`${s.each + 30}°`, `${s.each - 30 > 0 ? s.each - 30 : 45}°`, `${s.each * 2}°`],
    };
  }
  if (variant === "polygonSum") {
    const polys = [
      { name: "triangle", sum: 180 },
      { name: "quadrilateral", sum: 360 },
      { name: "pentagon", sum: 540 },
      { name: "hexagon", sum: 720 },
    ];
    const p = pick(rng, polys);
    return {
      prompt: `What is the sum of the interior angles of a ${p.name}?`,
      correct: `${p.sum}°`,
      distractors: polys.filter(q => q.name !== p.name).map(q => `${q.sum}°`),
    };
  }
  // exteriorAngle
  const a = randInt(rng, 30, 90);
  const b = randInt(rng, 30, 150 - a);
  const interior = 180 - a - b;
  const exterior = 180 - interior;
  return {
    prompt: `Two angles of a triangle are ${a}° and ${b}°.\nWhat is the exterior angle at the third vertex?`,
    correct: `${exterior}°`,
    distractors: [`${interior}°`, `${180 - exterior}°`, `${exterior + 10}°`, `${a + b + 10}°`],
  };
}

function genRealWorld(rng, tier) {
  const all = [
    { prompt: "A door is opened until it is perfectly flat against the wall.\nWhat angle has it turned through?", correct: "180°", distractors:["90°","270°","360°","45°"] },
    { prompt: "A slide at a playground makes a 90° angle with the ground.\nWhat type of angle is this?", correct: "right", distractors:["acute","obtuse","straight"] },
    { prompt: "A ramp rises gently at 30° to the ground.\nWhat type of angle is the ramp making?", correct: "acute", distractors:["right","obtuse","straight"] },
    { prompt: "The tip of a sharpened pencil forms a very pointy angle.\nWhich type of angle best describes it?", correct: "acute", distractors:["right","obtuse","straight"] },
    { prompt: "A book is lying flat open on a table.\nWhat angle is formed between its two covers?", correct: "180°", distractors:["90°","360°","270°","120°"] },
    { prompt: "A pizza is cut into 4 equal slices.\nWhat angle does each slice make at the centre?", correct: "90°", distractors:["45°","60°","120°","180°"] },
    { prompt: "A pizza is cut into 6 equal slices.\nWhat angle does each slice make at the centre?", correct: "60°", distractors:["45°","90°","30°","120°"] },
    { prompt: "A pizza is cut into 8 equal slices.\nWhat angle does each slice make at the centre?", correct: "45°", distractors:["60°","30°","90°","40°"] },
    { prompt: "The corner of a square piece of paper forms what type of angle?", correct: "right", distractors:["acute","obtuse","straight"] },
    { prompt: "A straight road heading east turns and heads north.\nWhat angle has the road turned through?", correct: "90°", distractors:["45°","180°","270°","60°"] },
    { prompt: "An escalator rises at 45° to the floor.\nWhat type of angle is this?", correct: "acute", distractors:["right","obtuse","straight"] },
    { prompt: "Two walls in a room meet at a corner.\nWhat is the angle between them (measured inside the room)?", correct: "90°", distractors:["45°","180°","60°","270°"] },
    { prompt: "A see-saw is perfectly balanced and level.\nWhat angle does it make with the ground?", correct: "180°", distractors:["0°","90°","45°","360°"] },
    { prompt: "A clock's minute hand moves from 12 to 3.\nHow many degrees has it rotated?", correct: "90°", distractors:["60°","120°","180°","45°"] },
    { prompt: "A clock's minute hand moves from 12 to 6.\nHow many degrees has it rotated?", correct: "180°", distractors:["90°","270°","120°","360°"] },
    { prompt: "A clock's minute hand completes a full revolution.\nHow many degrees has it rotated?", correct: "360°", distractors:["90°","180°","270°"] },
    { prompt: "The letter V has what kind of angle at its bottom point?", correct: "acute", distractors:["right","obtuse","straight"] },
    { prompt: "The letter L has what kind of angle at its corner?", correct: "right", distractors:["acute","obtuse","straight"] },
    { prompt: "The tip of an arrowhead is most likely what type of angle?", correct: "acute", distractors:["right","obtuse","straight"] },
    { prompt: "A straight line drawn on paper represents what type of angle?", correct: "straight — 180°", distractors:["right — 90°","full — 360°","zero — 0°","reflex — more than 180°"] },
    { prompt: "If an angle is half the size of a right angle, what is its measure?", correct: "45°", distractors:["90°","30°","60°","180°"] },
    { prompt: "What angle is formed when clock hands show 6 o'clock?", correct: "180° — a straight angle", distractors:["90° — a right angle","270° — a reflex angle","360° — a full turn","0° — no angle"] },
    { prompt: "What angle is formed when clock hands show 3 o'clock?", correct: "90° — a right angle", distractors:["180° — a straight angle","45° — an acute angle","60° — an acute angle","270° — a reflex angle"] },
    { prompt: "A scissors blade is opened wide to 150°.\nWhat type of angle is formed between the blades?", correct: "obtuse", distractors:["acute","right","straight"] },
    { prompt: "The hands of a clock at 9 o'clock form what type of angle?", correct: "right", distractors:["acute","obtuse","straight"] },
  ];
  const pool = tier <= 2 ? all.slice(0, 12) : all;
  return pick(rng, pool);
}

function genAngles(rng, tier) {
  const pools = {
    1: ["angleType","clock","letters","realWorld","compSupp","turns"],
    2: ["angleType","clock","letters","realWorld","compSupp","turns"],
    3: ["clock","compSupp","letters","shapes","turns","angleType","realWorld"],
    4: ["compSupp","shapes","clock","turns","angleType","realWorld","letters"],
    5: ["compSupp","shapes","clock","turns","realWorld","angleType","shapes"],
  };
  const variant = pick(rng, pools[tier] || pools[3]);
  if (variant === "angleType")  return genAngleType(rng, tier);
  if (variant === "clock")      return genClockAngle(rng, tier);
  if (variant === "letters")    return genLetterAngles(rng, tier);
  if (variant === "compSupp")   return genCompSuppAngles(rng, tier);
  if (variant === "turns")      return genTurns(rng, tier);
  if (variant === "shapes")     return genAnglesInShapes(rng, tier);
  if (variant === "realWorld")  return genRealWorld(rng, tier);
  return genAngleType(rng, tier);
}

const CATEGORIES = [
  { key: "numeration", label: "Numbers", symbol: "#", color: "#7FB8E0", gen: genNumeration, blurb: "Digit riddles, place value & number systems" },
  { key: "addition", label: "Addition", symbol: "+", color: "#F2C744", gen: genAddition, blurb: "Big sums, decimals, and missing-number equations" },
  { key: "subtraction", label: "Subtraction", symbol: "−", color: "#F2785C", gen: genSubtraction, blurb: "Take-away and difference practice" },
  { key: "multiplication", label: "Multiplication", symbol: "×", color: "#E58FC2", gen: genMultiplication, blurb: "Times tables and quick products" },
  { key: "roman", label: "Roman Numerals", symbol: "IV", color: "#C9A14A", gen: genRoman, blurb: "Reading and writing Roman numerals" },
  { key: "area", label: "Area & Perimeter", symbol: "▭", color: "#7FD9B9", gen: genAreaPerimeter, blurb: "Area and perimeter of simple shapes" },
  { key: "fractions", label: "Fractions", symbol: "½", color: "#B79CED", gen: genFractions, blurb: "Compare, add, reduce, convert mixed & improper" },
  { key: "decimals", label: "Decimals", symbol: ".", color: "#6FCF97", gen: genDecimals, blurb: "Decimal place value and comparisons" },
  { key: "angles", label: "Angles", symbol: "∠", color: "#F2994A", gen: genAngles, blurb: "Clocks, letters, shapes, turns & real-world angles" },
];

const TIERS = 5;
const PER_TIER = 20;
const PER_TOPIC = TIERS * PER_TIER; // 100

/* Build the canonical (un-shuffled) question bank: 100 questions per topic,
   in 5 tiers of 20, each tier a bit harder than the last. */
function generateQuestionBank(seed = 1337) {
  const baseRng = mulberry32(seed);
  const bank = {};
  CATEGORIES.forEach((cat) => {
    const list = [];
    const seenPrompts = new Set();
    for (let tier = 1; tier <= TIERS; tier++) {
      for (let j = 0; j < PER_TIER; j++) {
        let raw, rng;
        let attempt = 0;
        do {
          const qSeed = Math.floor(baseRng() * 4294967295);
          rng = mulberry32(qSeed ^ ((tier * 1000 + j + attempt * 99991) * 2654435761));
          raw = cat.gen(rng, tier);
          attempt++;
        } while (seenPrompts.has(raw.prompt) && attempt < 12);
        seenPrompts.add(raw.prompt);
        let optsResult;
        if (raw.fixedOptions) {
          const opts = raw.fixedOptions.map(String);
          optsResult = { options: opts, correctIndex: opts.indexOf(String(raw.correct)) };
        } else {
          optsResult = buildOptions(rng, raw.correct, raw.distractors || []);
        }
        list.push({
          id: `${cat.key}-${tier}-${j}`,
          topic: cat.key,
          topicLabel: cat.label,
          topicColor: cat.color,
          tier,
          prompt: raw.prompt,
          options: optsResult.options,
          correctIndex: optsResult.correctIndex,
        });
      }
    }
    bank[cat.key] = list;
  });
  return bank;
}

/* ============================================================
   COOL FACTS — simple, analogy-driven concept cards shown
   every 5 questions within a topic
   ============================================================ */
const CONCEPT_FACTS = {
  numeration: [
    "A number is always divisible by 3 if its digits add up to a multiple of 3! Take 31,527,936 — its digits add up to 36 (a multiple of 3). So the whole number divides evenly by 3, no long division needed!",
    "Same trick works for 9! If a number's digits add up to a multiple of 9, the number itself divides evenly by 9. Try 4,536: 4+5+3+6 = 18, and 18 is a multiple of 9 — so 4,536 ÷ 9 works out perfectly!",
    "A number divides evenly by 5 if it ends in 0 or 5 — that's it, no math needed! Just peek at the very last digit.",
    "Think of place value like a hotel. Each digit lives in its own room — ones, tens, hundreds, thousands — and the room number tells you how much that digit is really worth, even if the digit itself looks the same!",
    "Zero isn't just \"nothing\" — it's a placeholder, like an empty parking spot. The spot still has a number painted on it, so every other car (digit) still knows exactly where it stands.",
    "In the Indian number system, big numbers are grouped as Lakhs (100,000) and Crores (10,000,000). In the International system, they're grouped as Hundred-Thousands and Millions. Same number, different \"team huddles\" of digits!",
    "A palindrome number reads the same forwards and backwards, like 12,321 — just like the word \"racecar\"!",
    "A million seconds is about 11.5 days. A billion seconds is about 31.7 years! Numbers that look only a little different in digits can be wildly different in real life.",
  ],
  addition: [
    "Addition is like a friendly handshake — it doesn't matter who reaches out first! 3 + 5 gives the exact same answer as 5 + 3. That's called the commutative property.",
    "Adding zero is the \"do nothing\" move in math. Add it to any number and absolutely nothing changes — like adding an empty box to a pile, the pile stays the same size.",
    "Carrying in addition is just like packing apples into baskets. If a basket can only hold 9 apples and you've got 10+, you seal that basket (carry the 1) and start a new one for the next column!",
    "Lining up decimal points before adding is like lining up shoes in pairs — left shoes with left shoes, right with right — so nothing gets mismatched. $15.25 + $3.457 only works if the dots line up first!",
    "Finding a missing addend is really subtraction wearing a disguise! In 150 + ___ = 425, you just do 425 − 150 to unmask the answer: 275.",
    "You can add numbers in any order or grouping and get the same answer: (2+3)+4 is the same as 2+(3+4). Math doesn't care which pair you add first!",
    "Quick mental trick: to add 9 to any number, add 10 instead, then take away 1. 47 + 9 becomes 47 + 10 − 1 = 56. Way faster!",
    "Estimating before you add is like checking a map before a road trip. Round 387 and 512 to 400 and 500 — your real answer should land close to 900.",
  ],
  subtraction: [
    "Subtraction is just addition in reverse — like rewinding a video to see where you started.",
    "Borrowing in subtraction is like breaking a $10 bill into ten $1 bills when you don't have enough ones to pay with. The total value never changes, just how it's split up!",
    "You can always check a subtraction answer by adding back! If 82 − 35 = 47, then 47 + 35 should bring you right back to 82.",
    "A difference is really just \"how many steps apart\" two numbers are on a number line. 9 − 4 = 5 means 9 and 4 are exactly 5 steps apart.",
    "Subtracting zero changes nothing — take away nothing, and you're left with everything you started with!",
    "Borrowing across zeros (like 1,000 − 1) is like knocking over a row of dominoes — each zero has to \"borrow\" from the next one in line before you can subtract.",
    "Quick mental trick: to subtract 9, subtract 10 then add 1 back. 64 − 9 becomes 64 − 10 + 1 = 55.",
    "In subtraction, order matters! Unlike addition, 10 − 4 and 4 − 10 are NOT the same — one even dips below zero.",
  ],
  multiplication: [
    "Multiplication is just repeated addition in a speedy disguise. 3 × 4 simply means \"four, three times\": 4 + 4 + 4 = 12.",
    "Like addition, multiplication doesn't care about order: 6 × 7 = 7 × 6. Picture an array of dots — turn it sideways and you still count the same total!",
    "Multiplying by 10 is the easiest trick in math — just slide every digit one place to the left (or tack on a zero). 24 × 10 = 240, instantly.",
    "Anything times zero equals zero. Picture 5 empty baskets — no matter how many baskets you line up, 5 × 0 apples is still 0 apples.",
    "Multiplying by 1 changes nothing — it's the \"mirror\" of multiplication, reflecting the exact same number right back at you.",
    "Big multiplications are easier in pieces! 6 × 14 is the same as 6 × 10 plus 6 × 4 = 60 + 24 = 84. Breaking numbers apart makes mental math much friendlier.",
    "A square number is just a number multiplied by itself — and it's called \"square\" because you can literally arrange that many dots into a perfect square shape!",
    "The 9-times-table finger trick: hold up 10 fingers, and for 9 × 3, fold down your 3rd finger. The fingers before it (2) and after it (7) spell out the answer: 27!",
  ],
  roman: [
    "Roman numerals have no symbol for zero! The Romans built their whole number system without ever needing the idea of \"nothing.\"",
    "When a smaller numeral comes BEFORE a bigger one, you subtract instead of add. IV isn't 1+5=6, it's 5−1=4 — like saying \"one before five.\"",
    "A Roman numeral letter never repeats more than 3 times in a row. III is 3, but 4 is never IIII — it's IV instead!",
    "V looks like an open hand with the thumb and fingers spread — that's no accident! Ancient tally marks for \"5\" likely came from sketching a hand.",
    "X (10) looks like two V's stacked point-to-point — like two open hands, ten fingers total!",
    "You'll still spot Roman numerals today: on clock faces, in movie sequels (Rocky IV), naming Super Bowls, and marking book chapters.",
    "Memory trick for the letters in order — I, V, X, L, C, D, M — try: \"I Value Xylophones Like Crazy Dancing Monkeys!\"",
    "For really huge Roman numbers, the Romans drew a bar (called a vinculum) over a numeral to multiply its value by 1,000!",
  ],
  area: [
    "Perimeter is like walking around the fence of a yard — it's just the distance around the outside. Area is like the grass inside the fence — it's the space you'd need to cover with paint.",
    "Area = length × width works because you're really counting tiny unit squares arranged in rows and columns — like tiles on a floor!",
    "Surprising fact: doubling BOTH sides of a rectangle doesn't just double the area, it quadruples it! A 2×3 rectangle (area 6) becomes 4×6 (area 24) — four times bigger.",
    "Two shapes can share the exact same perimeter but have totally different areas. A long skinny rectangle and a fat square can both have a 20 cm fence, but very different amounts of grass inside!",
    "A square is just a rectangle where all four sides happen to be equal — every square is a rectangle, but not every rectangle is a square.",
    "Area is measured in \"squared\" units (like cm²) because you're literally tiling the shape with tiny squares — each one is 1 unit by 1 unit.",
    "Perimeter only cares about the boundary, not what's inside. A shape could have a wild, twisty inside design, and its perimeter is still just the length of string it'd take to wrap around the edge.",
    "The biggest possible area for a fixed perimeter is always a square (or circle, if curves are allowed) — nature uses this trick, which is why soap bubbles are round!",
  ],
  fractions: [
    "A fraction is just fair pizza-sharing! The numerator (top) is how many slices you have, and the denominator (bottom) is how many slices the whole pizza was cut into.",
    "The bigger the denominator, the smaller each piece — even with the same numerator. 1/8 of a pizza is a much smaller slice than 1/2, because it's split among more people.",
    "Equivalent fractions are the same amount of pizza, just cut differently. 1/2 of a pizza is exactly the same as 2/4 of the same pizza — just sliced into more, smaller pieces.",
    "When two fractions have the same denominator, just compare the numerators — more slices means more pizza! 5/8 beats 3/8 because 5 slices is more than 3.",
    "Any fraction where the top equals the bottom is exactly one whole. 4/4 isn't \"4 quarters lying around\" — it's one whole pizza, fully assembled!",
    "Adding fractions with the same denominator is simple: just add the numerators and keep the denominator the same. 1/5 + 2/5 = 3/5 — the slice size never changes, you're just counting more slices.",
    "An improper fraction (like 5/4) just means you have MORE than one whole — picture one whole pizza plus one extra slice from a second pizza.",
    "You can't add fractions with different denominators directly — it's like trying to add apple slices and watermelon slices and calling them the same size. You need a common denominator first to make the \"slices\" match.",
  ],
  decimals: [
    "The decimal point is like a wall separating whole numbers from their parts — dollars on one side, cents on the other.",
    "Think of decimal places like money: $1 = 10 dimes (tenths place) = 100 pennies (hundredths place). Decimals work in exactly the same shrinking pattern.",
    "Adding zeros after a decimal point doesn't change its value: 0.5 = 0.50 = 0.500. They're like empty chairs at the end of a row — they don't add any more people!",
    "To compare decimals, read left to right just like a book: compare the whole number first, then tenths, then hundredths. 4.83 beats 4.79 because 8 beats 7 in the tenths spot.",
    "Decimals and fractions are best friends in disguise — 0.5 is just another way to write 1/2, and 0.25 is the same as 1/4.",
    "Decimal place names mirror whole number place names, just flipped across the decimal point: tenths mirrors tens, hundredths mirrors hundreds.",
    "Decimals let us measure things more precisely than whole numbers ever could. A sprinter doesn't finish in \"about 10 seconds\" — they finish in 9.58 seconds!",
    "Multiplying a decimal by 10 just slides the decimal point one spot to the right. 3.45 × 10 = 34.5 — same digits, the point just hops over!",
  ],
  angles: [
    "An acute angle is small and pointy — just remember, it's \"a cute little angle,\" always less than 90°.",
    "A right angle is exactly 90° — picture the perfect corner of a book or a sheet of paper. It's called \"right\" because it's perfectly upright, not tilted either way.",
    "An obtuse angle is wide and stretched out, more than 90° but less than 180° — like a door swung most of the way open.",
    "A straight angle is exactly 180° — it's just a straight line! No bend at all, like a perfectly flat road.",
    "A full turn all the way around back to where you started is 360° — like a clock's minute hand sweeping all the way around the face.",
    "The three angles inside ANY triangle always add up to exactly 180°, no matter how big, small, or oddly-shaped the triangle is. It's like a fixed budget of 180° split three ways!",
    "Angles sitting on a straight line always add up to 180° too — they're sharing that same straight-line \"budget\" between them.",
    "At exactly 3 o'clock, a clock's hour and minute hands form a perfect right angle — 90° on the dot!",
  ],
};



/* ============================================================
   COMPONENT
   ============================================================ */
const STORAGE_KEY = "math-on-the-move-progress-v1";
const LETTERS = ["A", "B", "C", "D"];
const QUESTIONS_PER_FACT = 5;

export default function MathOnTheMove() {
  const bank = useMemo(() => generateQuestionBank(1337), []);
  // a fresh random seed each time the app loads, so order is mixed up every session
  // (each 20-question tier block is shuffled internally, but tier order is kept
  // so difficulty still ramps up every 20 questions)
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 2147483647) + 1);
  const questionsByTopic = useMemo(() => {
    const orderRng = mulberry32(sessionSeed);
    const result = {};
    CATEGORIES.forEach((cat) => {
      const full = bank[cat.key];
      const out = [];
      for (let start = 0; start < full.length; start += PER_TIER) {
        const chunk = full.slice(start, start + PER_TIER);
        out.push(...shuffle(orderRng, chunk));
      }
      result[cat.key] = out;
    });
    return result;
  }, [bank, sessionSeed]);

  // interleave a "Cool Fact" card after every 5 questions within each topic
  const sequenceByTopic = useMemo(() => {
    const result = {};
    CATEGORIES.forEach((cat) => {
      const qs = questionsByTopic[cat.key];
      const facts = CONCEPT_FACTS[cat.key] || [];
      const seq = [];
      let factCursor = 0;
      qs.forEach((q, i) => {
        seq.push({ type: "question", q, qNumber: i + 1 });
        if ((i + 1) % QUESTIONS_PER_FACT === 0 && facts.length > 0) {
          seq.push({ type: "fact", fact: facts[factCursor % facts.length], afterQuestionNumber: i + 1 });
          factCursor++;
        }
      });
      result[cat.key] = seq;
    });
    return result;
  }, [questionsByTopic]);

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [indexByTopic, setIndexByTopic] = useState({});
  const [answers, setAnswers] = useState({}); // { [questionId]: true } once solved correctly
  const [ready, setReady] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(null);
  const [bump, setBump] = useState(false);

  // Load progress
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
       const saved = localStorage.getItem("math-on-the-move-progress");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.indexByTopic) setIndexByTopic(p => ({ ...p, ...parsed.indexByTopic }));
          if (parsed.answers) setAnswers(parsed.answers);
          if (parsed.selectedTopic) setSelectedTopic(parsed.selectedTopic);
        }
        setReady(true);
      } catch (e) {
        // no saved progress yet
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save progress
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        localStorage.setItem("math-on-the-move-progress",
        JSON.stringify({ selectedTopic, indexByTopic, answers }));
      } catch (e) {}
    })();
  }, [selectedTopic, indexByTopic, answers, ready]);

  const currentSeq = selectedTopic ? sequenceByTopic[selectedTopic] : [];
  const localIndex = selectedTopic ? indexByTopic[selectedTopic] || 0 : 0;
  const item = selectedTopic ? currentSeq[localIndex] : null;
  const q = item && item.type === "question" ? item.q : null;
  const hasAnswered = q ? !!answers[q.id] : false;

  useEffect(() => {
    setWrongFlash(null);
  }, [selectedTopic, localIndex]);

  const pointsForTopic = useCallback(
    (topicKey) => questionsByTopic[topicKey].filter((qq) => answers[qq.id]).length,
    [questionsByTopic, answers]
  );

  const selectOption = useCallback(
    (optIdx) => {
      if (!q || hasAnswered) return;
      if (optIdx === q.correctIndex) {
        setAnswers((prev) => ({ ...prev, [q.id]: true }));
        setWrongFlash(null);
        setBump(true);
        setTimeout(() => setBump(false), 260);
      } else {
        setWrongFlash(optIdx);
      }
    },
    [hasAnswered, q]
  );

  const goNext = useCallback(() => {
    if (!selectedTopic) return;
    setIndexByTopic((prev) => ({
      ...prev,
      [selectedTopic]: Math.min(currentSeq.length - 1, (prev[selectedTopic] || 0) + 1),
    }));
  }, [selectedTopic, currentSeq.length]);

  const goPrev = useCallback(() => {
    if (!selectedTopic) return;
    setIndexByTopic((prev) => ({
      ...prev,
      [selectedTopic]: Math.max(0, (prev[selectedTopic] || 0) - 1),
    }));
  }, [selectedTopic]);

  useEffect(() => {
    if (!selectedTopic) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, selectedTopic]);

  const doReset = async () => {
    if (!selectedTopic) return;
    const idsInTopic = new Set(questionsByTopic[selectedTopic].map((qq) => qq.id));
    setAnswers((prev) => {
      const next = { ...prev };
      idsInTopic.forEach((id) => delete next[id]);
      return next;
    });
    setIndexByTopic((prev) => ({ ...prev, [selectedTopic]: 0 }));
    setConfirmReset(false);
  };

  const goHome = () => setSelectedTopic(null);

  const sharedStyle = {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #244840 0%, #1B362F 55%, #142822 100%)",
    fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
    color: "#F5F1E6",
    display: "flex",
    flexDirection: "column",
  };

  const globalStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Atkinson+Hyperlegible:wght@400;700&display=swap');
      .chalk-card {
        background: radial-gradient(circle at 18% 12%, rgba(255,255,255,0.05), transparent 45%),
                    radial-gradient(circle at 82% 88%, rgba(255,255,255,0.04), transparent 40%),
                    #20413A;
        border: 1.5px solid rgba(245,241,230,0.22);
        box-shadow: inset 0 0 0 1px rgba(245,241,230,0.04), 0 14px 30px -12px rgba(0,0,0,0.55);
        position: relative;
      }
      .chalk-card::before {
        content: "";
        position: absolute;
        inset: 6px;
        border: 1px dashed rgba(245,241,230,0.10);
        border-radius: 10px;
        pointer-events: none;
      }
      .opt-btn { font-family: 'Atkinson Hyperlegible', system-ui, sans-serif; transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease; }
      .opt-btn:active { transform: scale(0.98); }
      .opt-btn.shake { animation: shake 0.32s ease; }
      @keyframes shake {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-4px); }
        40%, 60% { transform: translateX(4px); }
      }
      .nav-circle { transition: transform 0.12s ease, background 0.15s ease; }
      .nav-circle:active { transform: scale(0.92); }
      .nav-circle:disabled { opacity: 0.3; }
      @keyframes bumpIn { 0% { transform: scale(0.92); opacity: 0.6; } 100% { transform: scale(1); opacity: 1; } }
      .bump { animation: bumpIn 0.22s ease; }
      .handwritten { font-family: 'Patrick Hand', cursive; }
      .topic-card { transition: transform 0.12s ease, border-color 0.15s ease; }
      .topic-card:active { transform: scale(0.98); }
    `}</style>
  );

  /* ---------------- HOME / TOPIC SELECT ---------------- */
  if (!selectedTopic) {
    return (
      <div style={sharedStyle}>
        {globalStyles}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", maxWidth: 480, marginInline: "auto", width: "100%" }}>
          <div className="handwritten" style={{ fontSize: 42, color: "#F2C744", textAlign: "center", lineHeight: 1.1 }}>
            Math on the Move
          </div>
          <div style={{ color: "rgba(245,241,230,0.6)", fontSize: 15, marginTop: 6, marginBottom: 4, textAlign: "center", fontStyle: "italic" }}>
            One step at a time.
          </div>
          <div style={{ color: "rgba(245,241,230,0.4)", fontSize: 12.5, marginBottom: 30, textAlign: "center", maxWidth: 280 }}>
            👟 Each correct answer is one step forward earned. Play anywhere — traffic, flights, waiting rooms.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
            {CATEGORIES.map((cat) => {
              const total = PER_TOPIC;
              const pts = pointsForTopic(cat.key);
              const pct = Math.round((pts / total) * 100);
              return (
                <button
                  key={cat.key}
                  className="chalk-card topic-card"
                  onClick={() => setSelectedTopic(cat.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 18px",
                    borderRadius: 16,
                    cursor: "pointer",
                    textAlign: "left",
                    color: "#F5F1E6",
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: cat.color + "26",
                      border: `2px solid ${cat.color}`,
                      color: cat.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                      fontWeight: 700,
                    }}
                  >
                    {cat.symbol}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="handwritten" style={{ fontSize: 21, color: "#F5F1E6" }}>{cat.label}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(245,241,230,0.55)", marginTop: 1 }}>{cat.blurb}</div>
                    <div style={{ marginTop: 8, height: 5, borderRadius: 999, background: "rgba(245,241,230,0.12)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: cat.color, borderRadius: 999 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="handwritten" style={{ fontSize: 18, color: cat.color }}>{pts} steps</div>
                    <div style={{ fontSize: 11, color: "rgba(245,241,230,0.45)" }}>of {total}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- PRACTICE SCREEN ---------------- */
  const topicMeta = CATEGORIES.find((c) => c.key === selectedTopic);
  const refQNumber = item ? (item.type === "question" ? item.qNumber : item.afterQuestionNumber) : 1;
  const progressPct = (refQNumber / PER_TOPIC) * 100;
  const points = pointsForTopic(selectedTopic);
  const currentTier = Math.min(TIERS, Math.ceil(refQNumber / PER_TIER));

  return (
    <div style={sharedStyle}>
      {globalStyles}

      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button
            onClick={goHome}
            style={{
              background: "rgba(245,241,230,0.08)",
              border: "1px solid rgba(245,241,230,0.2)",
              color: "#F5F1E6",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Topics
          </button>
          <span
            className="handwritten"
            style={{
              fontSize: 16,
              color: topicMeta.color,
              border: `1.5px solid ${topicMeta.color}`,
              background: topicMeta.color + "1f",
              borderRadius: 999,
              padding: "3px 14px",
            }}
          >
            {topicMeta.label}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11.5, color: "rgba(245,241,230,0.5)" }}>Level</span>
          {[1, 2, 3, 4, 5].map((t) => (
            <div
              key={t}
              title={`Level ${t}`}
              style={{
                width: t === currentTier ? 22 : 8,
                height: 8,
                borderRadius: 999,
                background: t === currentTier ? topicMeta.color : t < currentTier ? topicMeta.color + "66" : "rgba(245,241,230,0.18)",
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          {item.type === "question" ? (
            <div className="handwritten" style={{ fontSize: 24, lineHeight: 1, color: "#F2C744" }}>
              Question {item.qNumber} <span style={{ color: "rgba(245,241,230,0.55)" }}>of {PER_TOPIC}</span>
            </div>
          ) : (
            <div className="handwritten" style={{ fontSize: 24, lineHeight: 1, color: "#F2C744" }}>
              ✨ Cool Fact <span style={{ color: "rgba(245,241,230,0.55)" }}>· {item.afterQuestionNumber} of {PER_TOPIC} done</span>
            </div>
          )}
          <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: "rgba(245,241,230,0.12)", overflow: "hidden", maxWidth: 320, marginInline: "auto" }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: `linear-gradient(90deg, ${topicMeta.color}, #F2C744)`, borderRadius: 999, transition: "width 0.3s ease" }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px" }}>
        {item.type === "fact" ? (
          <div key={`fact-${localIndex}`} className="chalk-card bump" style={{ width: "100%", maxWidth: 420, borderRadius: 16, padding: "26px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, justifyContent: "center" }}>
              <span style={{ fontSize: 28 }}>💡</span>
              <span className="handwritten" style={{ fontSize: 26, color: "#F2C744" }}>Cool Fact!</span>
            </div>
            <div style={{ fontSize: 17, lineHeight: 1.55, color: "#F5F1E6", textAlign: "left" }}>
              {item.fact}
            </div>
            <div style={{ marginTop: 18, textAlign: "center", fontSize: 12.5, color: "rgba(245,241,230,0.45)" }}>
              Tap the arrow to keep going →
            </div>
          </div>
        ) : (
          <div key={q.id} className={`chalk-card ${bump ? "bump" : ""}`} style={{ width: "100%", maxWidth: 420, borderRadius: 16, padding: "20px 18px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 8,
                background: q.topicColor + "33",
                color: q.topicColor,
                fontWeight: 700,
                fontSize: 14,
                border: `1px solid ${q.topicColor}66`,
              }}
            >
              {topicMeta.symbol}
            </span>
            <span style={{ fontSize: 13, letterSpacing: 0.4, color: "rgba(245,241,230,0.65)" }}>
              {q.topicLabel} · Level {q.tier}
            </span>
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35, whiteSpace: "pre-line", marginBottom: 20, minHeight: 56 }}>
            {q.prompt}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => {
              const isCorrectSlot = i === q.correctIndex;
              const isWrongFlash = wrongFlash === i;
              let bg = "rgba(245,241,230,0.04)";
              let border = "1.5px solid rgba(245,241,230,0.18)";
              let textColor = "#F5F1E6";

              if (hasAnswered) {
                if (isCorrectSlot) {
                  bg = "rgba(127,217,185,0.16)";
                  border = "1.5px solid #7FD9B9";
                  textColor = "#7FD9B9";
                } else {
                  textColor = "rgba(245,241,230,0.4)";
                }
              } else if (isWrongFlash) {
                bg = "rgba(242,120,92,0.14)";
                border = "1.5px solid #F2785C";
                textColor = "#F2785C";
              }

              return (
                <button
                  key={i}
                  className={`opt-btn ${isWrongFlash && !hasAnswered ? "shake" : ""}`}
                  onClick={() => selectOption(i)}
                  disabled={hasAnswered}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: bg,
                    border,
                    color: textColor,
                    cursor: hasAnswered ? "default" : "pointer",
                    fontSize: 17,
                  }}
                >
                  <span
                    className="handwritten"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      border: `1.5px solid ${textColor}`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {LETTERS[i]}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {hasAnswered && isCorrectSlot && <Check size={18} color="#7FD9B9" />}
                  {!hasAnswered && isWrongFlash && <X size={18} color="#F2785C" />}
                </button>
              );
            })}
          </div>

          {!hasAnswered && wrongFlash !== null && (
            <div style={{ marginTop: 12, fontSize: 13, color: "rgba(245,241,230,0.55)", textAlign: "center" }}>
              Not quite — try again!
            </div>
          )}
          </div>
        )}
      </div>

      <div style={{ padding: "10px 18px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 460, marginInline: "auto", width: "100%" }}>
        <button
          className="nav-circle"
          onClick={goPrev}
          disabled={localIndex === 0}
          aria-label="Previous question"
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(245,241,230,0.08)", border: "1.5px solid rgba(245,241,230,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#F5F1E6", cursor: "pointer",
          }}
        >
          <ChevronLeft size={26} />
        </button>

        <div style={{ textAlign: "center" }}>
          <div className="handwritten" style={{ fontSize: 20, color: "#F2C744" }}>
            👟 {points} <span style={{ color: "rgba(245,241,230,0.5)", fontSize: 14 }}>steps</span>
          </div>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              style={{ background: "none", border: "none", color: "rgba(245,241,230,0.45)", fontSize: 12, marginTop: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <RotateCcw size={12} /> start over
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 12 }}>
              <button onClick={doReset} style={{ background: "none", border: "none", color: "#F2785C", cursor: "pointer", textDecoration: "underline" }}>
                Erase {topicMeta.label}
              </button>
              <button onClick={() => setConfirmReset(false)} style={{ background: "none", border: "none", color: "rgba(245,241,230,0.5)", cursor: "pointer" }}>
                cancel
              </button>
            </div>
          )}
        </div>

        <button
          className="nav-circle"
          onClick={goNext}
          disabled={localIndex === currentSeq.length - 1}
          aria-label="Next question"
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(242,199,68,0.18)", border: "1.5px solid #F2C744",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#F2C744", cursor: "pointer",
          }}
        >
          <ChevronRight size={26} />
        </button>
      </div>
    </div>
  );
}
