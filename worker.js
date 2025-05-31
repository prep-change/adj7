const denominations = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

self.onmessage = function (e) {
  const { input, baseTargets, autoFixed, maxTry } = e.data;

  const excludeSet = new Set(autoFixed);
  let result = findAdjustment(input, baseTargets, excludeSet, maxTry);

  if (!result && autoFixed.length > 0) {
    result = findAdjustment(input, baseTargets, new Set(), maxTry);
  }

  self.postMessage(result ? { success: true, ...result } : { success: false });
};

function findAdjustment(input, baseTargets, excludeSet, maxTry) {
  for (let t = 0; t <= maxTry; t++) {
    const patterns = generatePatterns(baseTargets, t, excludeSet);
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

      const usable = denominations.map(d => {
        const adjusted = input[d] + (shortage[d] || 0);
        const use = adjusted - (newTargets[d] || 0);
        return [d, use];
      }).filter(([_, c]) => c > 0);

      const combo = knapsack(usable, shortageTotal);
      if (combo) {
        return { newTargets, shortage, shortageTotal, combo };
      }
    }
  }
  return null;
}

function generatePatterns(baseTargets, extra, excludeSet) {
  if (extra === 0) return [Object.assign({}, baseTargets)];
  const patterns = [];
  const denoms = Object.keys(baseTargets).map(Number);

  function backtrack(i, remain, current) {
    if (i === denoms.length) {
      if (remain === 0) patterns.push({ ...current });
      return;
    }
    const denom = denoms[i];
    const limit = excludeSet.has(denom) ? 0 : (denom === 5000 ? Math.min(1, remain) : remain);
    for (let add = 0; add <= limit; add++) {
      current[denom] = baseTargets[denom] + add;
      backtrack(i + 1, remain - add, current);
    }
  }

  backtrack(0, extra, {});
  return patterns;
}

function knapsack(coins, target) {
  const dp = Array(target + 1).fill(null);
  dp[0] = {};

  for (let [d, cnt] of coins) {
    for (let a = target; a >= 0; a--) {
      if (dp[a] !== null) {
        for (let k = 1; k <= cnt; k++) {
          const na = a + d * k;
          if (na > target) break;
          const combo = { ...dp[a] };
          combo[d] = (combo[d] || 0) + k;
          if (!dp[na] || totalCoins(combo) < totalCoins(dp[na])) {
            dp[na] = combo;
          }
        }
      }
    }
  }
  return dp[target];
}

function totalCoins(combo) {
  return Object.values(combo).reduce((a, b) => a + b, 0);
}
