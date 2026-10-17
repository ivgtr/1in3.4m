import React from 'react';
import { Link } from '@tanstack/react-router';
import shared from '../components/shared.module.css';
import { EvidenceGuide } from '../components/Evidence.jsx';

export function AboutPage() {
  return <main className={shared['page']}><Link to="/">会社へ戻る</Link><h1>見守り、ときどき決める</h1><p>月ごとに時間が進み、仕事や仲間の相談が届きます。社長が交代しても、会社の時間と歴史は続きます。</p><p>自分で決めるか、重要判断だけを確認するか、すべてを任せるか。おまかせは実行できる選択肢から均等に抽選します。相談に触れると一時停止します。</p><p>記録はこのブラウザ内に保存されます。再読み込み後は停止状態から始まります。URLやブラウザが変わると保存した会社は引き継がれません。</p><EvidenceGuide /><section><h2>340万分の1という名前</h2><p>2021年6月時点の企業数約337.5万者を丸めた名称です。民営・非一次産業の会社と個人事業者を含み、今回の会社の生成確率や現在の企業数ではありません。</p><a href="https://www.chusho.meti.go.jp/koukai/chousa/chu_kigyocnt/2023/231213chukigyocnt.html" target="_blank" rel="noreferrer">中小企業庁の公表資料 ↗</a><p><a href="https://1in8b.life/ja/" target="_blank" rel="noreferrer">80億分の1 / 1 in 8 Billion</a>へのリスペクトから制作しました。公式作品・提携作品ではありません。</p></section></main>;
}
