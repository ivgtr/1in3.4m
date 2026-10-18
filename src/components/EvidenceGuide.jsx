import React from 'react';
import shared from './shared.module.css';
import { EVIDENCE, ASSUMPTIONS, GENERATION_ASSUMPTIONS, monthlyHazard } from '../domain/evidence.js';
import { REAL_START } from '../domain/insights.js';
import { num, money } from '../game/format.js';
import { EvidenceCard } from './EvidenceCard.jsx';
import { SuccessionEvidence } from './SuccessionEvidence.jsx';

export function EvidenceGuide() {
  return <div>
    <p className={shared['notice']}>架空の小さな開発会社のシミュレーションです。実測は調査対象の観測値、推計は別の期間・条件への変換、仮定は未測定のゲーム設計を表します。</p>
    <section className={shared['detail-section']}>
      <h3>見守り、ときどき決める</h3>
      <p>1期は3か月。月ごとに採用・交渉などの結果が届き、四半期に納品・入金・会計を集計します。相談を選ぶだけでは年月は進みません。</p>
      <p>「自分で決める」「重要判断は確認」「すべておまかせ」から選べます。おまかせは実行可能な選択肢から均等に抽選し、最適解を探しません。重要判断を確認する設定では資金調達・資金危機・廃業・売却・合併の相談で停止します。「すべて」は会社の終了も選び得ます。</p>
      <p>詳細や履歴を読むときは時間を止められます。別タブに移った後や再読込後は一時停止し、閉じている間の追いつき計算はしません。5年の節目でも会社は続けられます。年数だけで会社を終える上限はありません。</p>
    </section>
    <EvidenceCard kind="cyber" title="年間のインシデント経験：12.2% / 17.1%">
      <p>自己診断70点以上 / 69点以下の小規模企業群。発生経験企業の「影響なし」は32.2% / 23.0%。発生と影響を分けて扱います。</p>
      <p><strong>推計：</strong>月率 = 1 − (1 − 年率)^(1/12)。その年の初回経験まで、月ごとに一定の危険度を仮定します。低得点群の月率は約{(monthlyHazard(EVIDENCE.cyber.low.annual) * 100).toFixed(2)}%。同一年の複数事故は1つの事件経過に集約します。</p>
      <p>初期群は調査内の構成比を移植した架空の条件です。対策購入の効果を証明する数字ではありません。</p>
    </EvidenceCard>
    <EvidenceCard kind="hiring" title="年間採用計画が未達：31.9%">
      <p><strong>推計：</strong>通常募集の1名計画を12か月以内に達成できるかに移植しています。対象企業と小さな開発会社は同じ集団ではありません。</p>
      <p><strong>仮定：</strong>達成する計画の入社月は{GENERATION_ASSUMPTIONS.hiringMonths.join('・')}か月から均等に選びます。1年活動しても採用に至らない場合があります。給与は入社後から発生します。</p>
      <p>紹介で迎えると決めた候補者は3か月後の入社予定です。通常募集を紹介に切り替える場合は同じ計画の1枠を使い、通常募集の予定を取り消します。紹介への切替・追加採用は通常募集と別集計です。</p>
    </EvidenceCard>
    <EvidenceCard kind="departures" title="年間退職者0人：45.4%"><p>参考表示のみです。個人の離職率へ換算しません。ゲームの離職・入金遅延・受注の確率は仮定です。</p></EvidenceCard>
    <section className={shared['detail-section']}>
      <h3>対応が変えるもの</h3>
      <ul>
        <li>隔離バックアップ：復元方法と停止期間。発生率は変えません。導入{money(ASSUMPTIONS.backupCost)}、毎月{money(ASSUMPTIONS.backupMonthly)}。</li>
        <li>保険：対象復旧費の自己負担。事故・停止・流出を消しません。毎月{money(ASSUMPTIONS.insuranceMonthly)}、免責{money(ASSUMPTIONS.insuranceExcess)}を超える対象費用の{num(ASSUMPTIONS.insuranceShare * 100)}%を補填する仮定です。</li>
        <li>前受金：未回収額と手元資金。相手の事故率は変えません。受領分は納品前の負債です。</li>
        <li>採用・外注：能力と費用。社員の負担はその後の相談や退職条件に残ります。</li>
      </ul>
      <p><strong>仮定：</strong>被害がある場合は軽微45%・一部40%・全面15%。能力への影響はそれぞれ5%・35%・100%で、期間に応じて決算に反映します。費用・復旧期間・保険条件・流出・情報管理整備による参照群変更も仮定です。</p>
      <p>承継は準備・在籍・負担・資金の条件を確認します。社員は6か月、家族は12か月の準備を置く仮定です。承継しただけで成長の抽選や利益ボーナスは付けません。売却・合併の合意率は仮定です。</p>
    </section>
    <SuccessionEvidence />
    <EvidenceCard kind="closure" title="休廃業・解散企業の49.1%は直近黒字"><p>休廃業した企業の内訳です。「黒字企業が廃業する確率」として使いません。ゲームでは資金不足から再建・清算へ進み、独立した倒産抽選は行いません。</p></EvidenceCard>
    <EvidenceCard kind="survival" title="参考集団の4年間：存続89.7%、廃業8.9%"><p>追跡不能1.4%。開業直後からの5年生存率ではありません。対象・時代・観測開始が異なるため、会社の寿命や成功順位に換算しません。</p></EvidenceCard>
    <details className={shared['detail-section']}>
      <summary>創業時・開業後の参考調査</summary>
      <p>{REAL_START.publisher}「{REAL_START.title}」 · {REAL_START.observed}</p>
      <p>{REAL_START.population}</p>
      <p>創業時の人数は{num(REAL_START.n)}社の回答を参考表示します。資金や成功確率の比較には使いません。人材確保・育成・売上傾向は関連する経験の参考です。</p>
      <a href={REAL_START.url} target="_blank" rel="noreferrer">公庫の原資料を読む ↗</a>
    </details>
    <details className={shared['detail-section']}>
      <summary>会計・保存の仕様</summary>
      <p>納品を売上、給与・固定費・施策・外注・利息を費用に計上します。通常は売上の55%を当期、残りを次期に回収。借入元本は利益に含めません。</p>
      <p>通常の支払いは四半期、備え・復旧などは月次。前受金は納品時に充当し、保険補填は翌月に入金します。税・減価償却・貸倒などは省略しています。</p>
      <p>モデル・設定・乱数・選択と経過を保存します。同じ初期条件と選択列で再現できます。表示金額は万円単位に丸めています。</p>
    </details>
  </div>;
}
