# GitHub Pages 互換版 News Wire

この構成は **GitHub Pages で動かす前提**です。  
ブラウザから GNews API を直接呼ばず、**GitHub Actions が `data/news.json` を定期更新**し、`index.html` はその静的 JSON を読むだけにしています。

## なぜこの構成にするのか

GNews Free は **12時間遅延**で、**CORS は localhost のみ**です。  
そのため、GitHub Pages のような公開URL上でブラウザから直接 GNews を叩く構成は不向きです。

一方、GitHub Actions は **schedule** で定期実行でき、最短 5 分間隔です。シークレットもリポジトリに保存できます。

## 置くファイル

- `index.html`  
  GitHub Pages に公開する本体
- `data/news.json`  
  公開用の静的データ
- `scripts/update-news.cjs`  
  GNews から news.json を生成するスクリプト
- `.github/workflows/update-news.yml`  
  GitHub Actions の定期更新ワークフロー

## セットアップ手順

1. GitHub リポジトリのトップに、この一式を置く
2. **Settings → Secrets and variables → Actions** で `GNEWS_API_KEY` を作成する
3. **Settings → Pages** で `Deploy from a branch`、`main`、`/(root)` を選ぶ
4. 必要なら Actions タブから `Update news.json` を手動実行する
5. Pages の公開URLを開く

## 重要な注意

### GNews Free の場合
Free は **100 requests/day**、**up to 10 articles returned per request** です。

このサンプルの既定値は:

- 6カテゴリ
- 日本 + 世界
- 各10件
- 30分ごと

です。  
これは **1回の実行で少なくとも 12 リクエスト**使うため、Free では 1日上限を超えます。

### Free で動かすなら
`.github/workflows/update-news.yml` の以下を減らしてください。

- `GNEWS_CATEGORIES`: たとえば `general` のみにする
- cron: たとえば `0 */3 * * *` にして3時間ごとにする

### 有料プランなら
Essential 以上は **real-time article availability** と **CORS enabled for all origins**、件数上限拡大があります。  
この構成なら、ブラウザから直接APIを叩かないので、公開時もAPIキーは見えません。

## いまのHTMLの仕様

- 日本 / 海外の2列
- カテゴリ切替
- 横スクロール / 縦スクロール切替
- 表示件数切替
- ブラウザ内蔵 Translator API が使える環境では海外ニュースを日本語表示
- 未対応環境では原文表示

## よくある見直しポイント

- 10分更新にしたい  
  → Free ではかなり厳しいです。プランかカテゴリ数の見直しが必要です。
- 25件/50件を使いたい  
  → プランとリクエスト数の再設計が必要です。
- 絶対に最新が必要  
  → Free の 12時間遅延ではなく、有料プランが必要です。
