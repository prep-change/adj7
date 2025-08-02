// worker.js
const denominations = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
const knapsackCache = new Map();

onmessage = function (e) {
  const { input, baseTargets, excludeSetArray, maxTry } = e.data;
  const excludeSet = new Set(excludeSetArray);

  const result = findOptimalAdjustment(input, baseTargets, excludeSet, maxTry);
  postMessage(result || null);
};

function findOptimalAdjustment(input, baseTargets, excludeSet, maxTry = 12) {
  for (let t = 0; t <= maxTry; t++) {
    const patterns = generateAdjustmentPatterns(baseTargets, t, excludeSet);
    for (let newTargets of patterns) {
      const shortage = {};
      let shortageTotal = 0;

      for (let denom of denominations) {
        const need = newTargets[denom] || 0;
        const lack = Math.max(0, need - input[denom]);
        if (lack > 0) {
          shortage[denom] = lack;
          shortageTotal += denom * lack;
        }
      }

      const usableCoins = denominations.map(denom => {
        const adjustedInput = input[denom] + (shortage[denom] || 0);
        const usable = adjustedInput - (newTargets[denom] || 0);
        return [denom, usable];
      }).filter(([_, count]) => count > 0);

      const combo = knapsack(usableCoins, shortageTotal);
      if (combo) {
        return { newTargets, shortage, shortageTotal, combo };
      }
    }
  }
  return null;
}

function generateAdjustmentPatterns(baseTargets, extraCount, excludeSet) {
  if (extraCount === 0) return [Object.assign({}, baseTargets)];
  const patterns = [];
  const denoms = Object.keys(baseTargets).map(Number);

  function backtrack(i, remaining, current) {
    if (i === denoms.length) {
      if (remaining === 0) patterns.push({ ...current });
      return;
    }
    const denom = denoms[i];
    const limit = excludeSet.has(denom) ? 0 : ((denom === 5000) ? Math.min(1, remaining) : remaining);
    for (let add = 0; add <= limit; add++) {
      current[denom] = baseTargets[denom] + add;
      backtrack(i + 1, remaining - add, current);
    }
  }

  backtrack(0, extraCount, {});
  return patterns;
}

function knapsack(usableCoins, targetAmount) {
  const key = JSON.stringify(usableCoins) + "|" + targetAmount;
  if (knapsackCache.has(key)) return knapsackCache.get(key);

  const dp = Array(targetAmount + 1).fill(null);
  dp[0] = {};

  for (let [denom, count] of usableCoins) {
    for (let a = targetAmount; a >= 0; a--) {
      if (dp[a] !== null) {
        for (let k = 1; k <= count; k++) {
          const newAmount = a + denom * k;
          if (newAmount > targetAmount) break;
          const newCombo = { ...dp[a] };
          newCombo[denom] = (newCombo[denom] || 0) + k;

          if (
            dp[newAmount] === null ||
            totalCoins(newCombo) < totalCoins(dp[newAmount])
          ) {
            dp[newAmount] = newCombo;
          }
        }
      }
    }
  }

  knapsackCache.set(key, dp[targetAmount]);
  return dp[targetAmount];
}

function totalCoins(combo) {
  return Object.values(combo).reduce((sum, c) => sum + c, 0);
}