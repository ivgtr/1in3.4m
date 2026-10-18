import React from 'react';
import styles from './CompanyViews.module.css';
import shared from './shared.module.css';
import { money, dateAt, displayText } from '../game/format.js';
import { Discovery } from './Discovery.jsx';
const policyLabels = { growth: '新分野を育てる', maintain: '既存の信頼を守る', focus: '採算を整える', organise: '組織化', stopVenture: '投資の整理' };

export function Generations({ state }) {
  const life = state.life;
  return <section className={shared['detail-section']}>
    <h3>会社と、歴代の経営者</h3>
    <p>会社：{life.companyStatus === 'closed' ? '事業終了' : life.companyStatus === 'integrated' ? '他社・新会社へ統合' : '継続'}{state.suspended && ' · 保存・中断中'}</p>
    {life.epilogue && <section className={shared['detail-section']}><h4>引き継がれた事業の後日談</h4><p>{displayText(life.epilogue.text)}</p></section>}
    {life.ownerProceeds !== undefined && <p>売却対価（経営者に帰属）：{money(life.ownerProceeds)}。会社の手元資金には加えていません。価格式は仮定です。</p>}
    <div className={styles['generation-list']}>{life.generations.map(generation => <article className={shared['relationship-card']} key={generation.number}>
      <h4>第{generation.number}代 · {generation.name}</h4>
      <p>{dateAt(generation.start)}から{generation.end === undefined ? '現在まで' : `${dateAt(generation.end)}まで`} · 方針：{policyLabels[generation.policy]}</p>
      <p>{generation.baselineLabel || '引継ぎ時'}：資金 {money(generation.baseline.cash)} · 借入 {money(generation.baseline.debt)} · {generation.baseline.staff}人 · 顧客{generation.baseline.clients.length}社 · 進行案件{generation.baseline.contracts.length}件</p>
      <div>{[generation.baseline, ...generation.reviews].map((record, index) => <section key={record.month}>
        <p className={shared['eyebrow']}>{index ? `${(record.month - generation.start) / 12}年後` : generation.baselineLabel || '引継ぎ時'} · {record.periodMonths > 0 ? `直近${record.periodMonths}か月` : '決算前'}</p>
        <div className={styles['metrics']}><div className={styles['metric']}><span>売上</span><strong>{money(record.revenue)}</strong></div><div className={styles['metric']}><span>利益</span><strong>{money(record.profit)}</strong></div><div className={styles['metric']}><span>人数</span><strong>{record.staff}人</strong></div></div>
      </section>)}</div>
    </article>)}</div>
    <p className={shared['note']}>新事業・組織化・取引整理は、費用と日々の受注・納品を通じて結果が生まれます。年数だけの終了や、承継時の成長ボーナスはありません。</p>
    <Discovery kind="succession" state={state} />
  </section>;
}
