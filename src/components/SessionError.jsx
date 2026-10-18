import React from 'react';
import { Guidance } from './Guidance.jsx';
import { Button } from './Button.jsx';
import shared from './shared.module.css';

export function SessionError({ message }) {
  return <main className={shared.page}>
    <p className={shared.eyebrow}>記録の読み込み</p>
    <h1>会社を開けませんでした。</h1>
    <Guidance tone="error" actions={<Button onClick={() => location.reload()}>再読み込み</Button>}>
      <p role="alert">{message}</p>
      <p>通信状態や保存データの読み取りエラーを確認してから再読み込みしてください。保存データは変更していません。</p>
    </Guidance>
  </main>;
}
