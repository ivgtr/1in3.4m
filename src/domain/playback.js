// One cancellable timer. Playback never owns simulation state or randomness.
export class Playback {
 constructor({tick,delay,onChange=()=>{},schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),cancel=id=>globalThis.clearTimeout(id),now=()=>globalThis.performance.now()}){Object.assign(this,{tick,delay,onChange,schedule,cancel,now});this.wanted=false;this.speed=1;this.blocks=new Set();this.timer=null;this.generation=0;this.fraction=0;this.started=null;this.duration=0;}
 get running(){return this.wanted&&this.blocks.size===0;}
 get progress(){return Math.min(1,this.fraction+(this.started===null?0:(this.now()-this.started)/this.duration));}
 get remaining(){return Math.max(0,(1-this.progress)*this.delay(this.speed));}
 clear(){this.fraction=this.progress;this.started=null;this.generation++;if(this.timer!==null)this.cancel(this.timer);this.timer=null;}
 queue(){if(!this.running||this.timer!==null)return;const generation=this.generation;this.duration=this.delay(this.speed);this.started=this.now();this.timer=this.schedule(()=>{if(generation!==this.generation||!this.running)return;this.timer=null;this.started=null;this.fraction=0;try{this.tick();}catch(e){this.pause();throw e;}this.queue();this.onChange();},Math.max(0,this.duration*(1-this.fraction)));}
 change(){this.clear();this.queue();this.onChange();}
 restart(){this.clear();this.fraction=0;this.queue();this.onChange();}
 play(){this.wanted=true;this.change();}
 pause(){this.wanted=false;this.change();}
 block(reason,value){if(this.blocks.has(reason)===value)return;value?this.blocks.add(reason):this.blocks.delete(reason);this.change();}
 setSpeed(value){if(![.125,.25,.5,1,2].includes(value))return;this.clear();this.speed=value;this.queue();this.onChange();}
 dispose(){this.wanted=false;this.clear();}
}
export function milestone(s){
 if(!s.q)return null;
 const person=s.people.find(p=>!p.founding&&p.joined===s.q);if(person&&s.people.filter(p=>!p.founding).every(p=>p.joined>=s.q))return {title:`${person.name}が、最初の社員になった。`,text:'創業時の仲間に加えて、新しい人を迎えました。給与と仕事に慣れる時間も、この先の経歴に加わります。'};
 if(s.last.profit>0&&!s.history.some(h=>h.q<s.q&&h.profit>0))return {title:'初めて、利益が出た。',text:'この3か月は売上が費用を上回りました。利益と、実際に回収した現金は別の数字です。'};
 const contract=s.contracts.find(k=>k.kind==='large'&&k.end===s.q);if(contract)return {title:`${s.clients.find(c=>c.id===contract.clientId)?.name||'取引先'}の大口開発が終了。`,text:'追加受注の期間が終わりました。残った取引・人・仕事の量を確かめる節目です。'};
 const event=s.last.events?.find(e=>e.kind==='turning'||e.kind==='risk');return event?{title:event.title,text:event.text}:null;
}
export function displayDelay(s,speed){return 4000/speed;}
