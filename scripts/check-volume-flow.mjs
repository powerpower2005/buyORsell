/**
 * Quick sanity check for volume-flow formulas.
 * Run: node --experimental-strip-types scripts/check-volume-flow.mjs
 * (or via tsx if available)
 *
 * Uses plain JS mirror of core formulas — no Vite path aliases.
 */
function adStep(high, low, close, volume, prev = 0) {
  const range = high - low;
  const mfm = range === 0 ? 0 : ((close - low) - (high - close)) / range;
  return prev + mfm * volume;
}

function eomStep(prevH, prevL, h, l, volume, scale = 10000) {
  const range = h - l;
  if (range <= 0 || volume <= 0) return 0;
  const midMove = (h + l) / 2 - (prevH + prevL) / 2;
  const boxRatio = volume / scale / range;
  return boxRatio === 0 ? 0 : midMove / boxRatio;
}

// Close at high → full +volume
{
  const v = adStep(10, 0, 10, 100);
  if (Math.abs(v - 100) > 1e-9) throw new Error(`AD close@high expected 100 got ${v}`);
}
// Close at low → full −volume
{
  const v = adStep(10, 0, 0, 100);
  if (Math.abs(v - -100) > 1e-9) throw new Error(`AD close@low expected -100 got ${v}`);
}
// Mid close → 0
{
  const v = adStep(10, 0, 5, 100);
  if (Math.abs(v) > 1e-9) throw new Error(`AD mid expected 0 got ${v}`);
}
// EOM: up move with low volume → positive
{
  const v = eomStep(10, 8, 12, 10, 1000);
  if (!(v > 0)) throw new Error(`EOM up expected >0 got ${v}`);
}

console.log("volume-flow check ok");
