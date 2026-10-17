// One source for the label beside playback. Capability is not running state.
export function progressState({exists=true,ended=false,suspended=false,checkpoint=false,wanted=false,running=false,pending=false,auto=false,remaining=0,reading=false}){
 if(!exists)return '創業前';
 if(ended)return '会社の振り返り';
 if(pending&&!auto&&!suspended)return 'あなたの選択待ち';
 if(suspended||!wanted)return reading?'一時停止 · 履歴を閲覧中':'一時停止';
 if(pending&&!auto)return 'あなたの選択待ち';
 if(!running)return '一時停止';
 if(pending)return 'おまかせで返答予定';
 return checkpoint?'節目を確認中':'進行中';
}
export function historyReadIntent({intent,top}){return intent&&top>40;}
