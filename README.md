# 台股看盤資料站 🇹🇼📈

一個以 **Next.js (App Router) + TypeScript + Tailwind** 打造的台股看盤資料站,
資料來源為 **臺灣證券交易所(TWSE)公開資料**。

## 功能

- 🔍 **個股查詢**:輸入股票代號(如 `2330`)即可查詢
- 📊 **報價 / 日 K 線**:開高低收、成交量、蠟燭圖(紅漲綠跌)
- 📈 **技術指標**:MA5/20/60、KD、RSI、MACD
- 🏦 **三大法人買賣超**:外資、投信、自營商(近 20 個交易日)
- 💰 **基本面快照**:本益比、殖利率、股價淨值比
- 📑 **財報**:月營收(MoM/YoY)、EPS、毛利、淨利(證交所 OpenAPI)
- 🏢 **上市 + 上櫃**:TWSE 查無資料時自動 fallback 到 TPEX
- 🤖 **AI 深度分析**:以 Claude(`stock-deepdive-tw` skill)即時搜尋後產生分析(需 API key)

## AI 深度分析(選用)

個股頁的「🤖 AI 深度分析」會呼叫 **Claude API**,把 `.claude/skills/stock-deepdive-tw`
當作 system prompt,並啟用 **web search** 即時查當前財報與股價,串流回傳結構化分析
(財務體質、估值、成長、多空、決策框架)。

啟用方式:複製 `.env.example` 為 `.env.local`,填入 `ANTHROPIC_API_KEY`。
未設定金鑰時,網站其他功能照常運作,只有這顆按鈕會提示需設定金鑰。

- 模型:預設 `claude-opus-4-8`(可用環境變數 `ANALYSIS_MODEL` 覆寫)
- 採 adaptive thinking + 串流輸出 + system prompt 快取
- 實作:`lib/anthropic.ts`、`app/api/analyze/[id]`、`components/AnalysisPanel.tsx`

## 技術架構

```
瀏覽器 (React/Next 前端)
   │  fetch /api/*
   ▼
Next.js API Routes (server 端代理 + 記憶體快取)
   │  fetch
   ▼
證交所公開 API (TWSE)
```

> **為什麼需要後端代理?**
> 證交所公開 API 有 CORS 限制與流量限制,瀏覽器直接呼叫會被擋。
> 因此由 Next.js 的 API route 在 server 端抓取、快取後再回傳給前端。

### 主要檔案

| 路徑 | 說明 |
| --- | --- |
| `lib/twse.ts` | 證交所資料存取層(報價、三大法人、本益比、即時報價)+ 記憶體快取 |
| `lib/indicators.ts` | 技術指標計算(SMA / EMA / RSI / KD / MACD) |
| `app/api/quote/[id]` | 報價 + 日 K 線 API |
| `app/api/institutional/[id]` | 三大法人買賣超 API |
| `app/api/valuation/[id]` | 本益比 / 殖利率 / 股價淨值比 API |
| `components/CandleChart.tsx` | K 線圖(lightweight-charts) |
| `components/IndicatorPanel.tsx` | 技術指標數值面板 |
| `components/InstitutionalTable.tsx` | 三大法人表格 |

## 本機開發

```bash
npm install
npm run dev
# 開啟 http://localhost:3000
```

## 部署到 Vercel

1. 把這個 repo 推到 GitHub
2. 到 [vercel.com](https://vercel.com) 匯入此專案,框架會自動偵測為 Next.js
3. 直接 Deploy,免設定環境變數

## ⚠️ 注意事項

- **資料延遲**:即時報價端點在盤後可能回傳前一日資料;一般帳號取得的是延遲行情。
- **流量限制**:證交所對同一 IP 有請求頻率限制。本專案已用記憶體快取降低請求數,
  若大量使用建議改用持久化快取(如 Redis / KV)。
- **免責聲明**:本站資料僅供參考,不構成任何投資建議。

## 證交所公開資料端點(供擴充參考)

| 資料 | 端點 |
| --- | --- |
| 個股日成交 | `/rwd/zh/afterTrading/STOCK_DAY?date=YYYYMMDD&stockNo=XXXX` |
| 三大法人買賣超 | `/rwd/zh/fund/T86?date=YYYYMMDD&selectType=ALL` |
| 本益比/殖利率/淨值比 | `/rwd/zh/afterTrading/BWIBBU_d?date=YYYYMMDD&selectType=ALL` |
| 即時報價 | `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_XXXX.tw&json=1` |

## 後續可擴充方向

- 上櫃(TPEX)個股資料整合
- 月營收、財報(EPS、毛利率)— 來自公開資訊觀測站(MOPS)
- 融資融券、借券賣出等籌碼資料
- 自選股清單、價格警示
- 持久化快取(Redis / Vercel KV)與排程更新
