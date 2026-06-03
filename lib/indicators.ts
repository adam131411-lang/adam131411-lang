/**
 * 技術指標計算(純函式,可在 client 端使用)。
 * 輸入皆為依時間排序的 close/high/low 陣列。
 */

export type Series = (number | null)[];

/** 簡單移動平均 SMA / MA */
export function sma(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = +(sum / period).toFixed(2);
  }
  return out;
}

/** 指數移動平均 EMA */
export function ema(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (prev == null) {
      // 用前 period 筆的 SMA 當起始值
      if (i >= period - 1) {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += values[j];
        prev = sum / period;
        out[i] = +prev.toFixed(2);
      }
    } else {
      prev = values[i] * k + prev * (1 - k);
      out[i] = +prev.toFixed(2);
    }
  }
  return out;
}

/** RSI(相對強弱指標),Wilder 平滑 */
export function rsi(close: number[], period = 14): Series {
  const out: Series = new Array(close.length).fill(null);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < close.length; i++) {
    const diff = close[i] - close[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        out[i] = +(100 - 100 / (1 + avgGain / (avgLoss || 1e-9))).toFixed(2);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = +(100 - 100 / (1 + avgGain / (avgLoss || 1e-9))).toFixed(2);
    }
  }
  return out;
}

/** KD(隨機指標),預設 9 日 RSV、3 日平滑 */
export function kd(
  high: number[],
  low: number[],
  close: number[],
  period = 9
): { k: Series; d: Series } {
  const k: Series = new Array(close.length).fill(null);
  const d: Series = new Array(close.length).fill(null);
  let prevK = 50;
  let prevD = 50;
  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) continue;
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, high[j]);
      ll = Math.min(ll, low[j]);
    }
    const rsv = hh === ll ? 0 : ((close[i] - ll) / (hh - ll)) * 100;
    prevK = (2 / 3) * prevK + (1 / 3) * rsv;
    prevD = (2 / 3) * prevD + (1 / 3) * prevK;
    k[i] = +prevK.toFixed(2);
    d[i] = +prevD.toFixed(2);
  }
  return { k, d };
}

/** MACD,預設 (12, 26, 9) */
export function macd(
  close: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: Series; signal: Series; histogram: Series } {
  const emaFast = ema(close, fast);
  const emaSlow = ema(close, slow);
  const dif: number[] = [];
  const difSeries: Series = close.map((_, i) => {
    if (emaFast[i] == null || emaSlow[i] == null) {
      dif.push(NaN);
      return null;
    }
    const v = +((emaFast[i] as number) - (emaSlow[i] as number)).toFixed(2);
    dif.push(v);
    return v;
  });
  // signal 線是 DIF 的 EMA;先把有效 DIF 取出計算
  const validDif = dif.map((v) => (Number.isNaN(v) ? 0 : v));
  const signalRaw = ema(validDif, signal);
  const signalSeries: Series = close.map((_, i) =>
    difSeries[i] == null ? null : signalRaw[i]
  );
  const histogram: Series = close.map((_, i) => {
    if (difSeries[i] == null || signalSeries[i] == null) return null;
    return +(
      (difSeries[i] as number) - (signalSeries[i] as number)
    ).toFixed(2);
  });
  return { macd: difSeries, signal: signalSeries, histogram };
}
