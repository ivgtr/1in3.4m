# 340万分の1 — 1 in 3.4 Million

偶然の境遇から生まれた会社を見守るブラウザゲーム。採用・取引・資金繰りの相談に自分で判断するか、おまかせで返答し、世代交代を重ねながら一社の歴史を作ります。

## ローカルで遊ぶ

Node.js 24.15.0以上が必要です。

```sh
npm ci
npm start
```

http://127.0.0.1:4173 を開きます。

会社の記録はブラウザ内に保存されます。別のブラウザや配信元には自動で引き継がれません。記録の書き出しはできますが、インポート機能はありません。

## 開発・検証

React + Vite + TanStack Routerの静的SPAです。開発方針は [AGENTS.md](AGENTS.md)、コマンドの定義は [package.json](package.json) を参照してください。

```sh
npm test
npm run build
npx playwright install chromium --only-shell # ブラウザテストの初回準備
npm run test:browser
```

ビルドでは容量・依存関係も検査します。配信物を手動で確認する場合は `npm run preview` を使います。

## 公開

ビルドで生成した `dist/` の中身を静的ホスティングへ配置します。サブディレクトリへの配置にも対応し、SPA用のサーバー書き換えは不要です。GitHub Actionsは検証のみで、自動デプロイはしません。

## 出典・クレジット

名称は[中小企業庁による2021年6月時点の企業数](https://www.chusho.meti.go.jp/koukai/chousa/chu_kigyocnt/2023/231213chukigyocnt.html)約337.5万者に由来します。実企業の生成確率や存続率を予測するゲームではありません。統計の出典・推計・仮定はゲーム内の「データと遊び方」で説明しています。

[80億分の1 / 1 in 8 Billion](https://1in8b.life/ja/)の体験と命名構造を参考に制作しました。公式作品・提携作品ではありません。
