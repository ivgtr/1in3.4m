import {create,rng} from './model.js?v=0.9.1';
// Fictional casting and correlated circumstances, not a population estimate.
export function createEncounter(seed,name,base,originId){
 let config=structuredClone(base),recipe=config.encounter;
 if(!recipe){
  const stream={rng:(seed^0x79AB123)>>>0},pick=a=>a[Math.floor(rng(stream)*a.length)],take=a=>a.splice(Math.floor(rng(stream)*a.length),1)[0];
  originId||=pick(config.origins).id;const o=config.origins.find(o=>o.id===originId);
  const names=['佐藤','田中','鈴木','高橋','中村','加藤','松本','清水','森','石井','小林','岡田','山田','阿部','池田','大野'];
  const founder=take(names),count=pick(originId==='builders'?[1,2]:originId==='local'?[0,1]:[0,1,2]);
  o.team=Array.from({length:count},()=>take(names));
  const regions=[{name:'駅前の共同オフィス',fixed:15,cash:120},{name:'住宅地の小さな事務所',fixed:0,cash:0},{name:'地元の空き店舗',fixed:-10,cash:-60}],region=pick(regions);
  o.fixed=Math.max(15,o.fixed+region.fixed);o.cash=o.cash.map(v=>v+region.cash+(count-base.origins.find(x=>x.id===originId).team.length)*240);
  const clients=['青葉製作所','日和物流','北原商事','みなと印刷','星野食品','小川工務店','川辺商店','三木機工','南風出版','東光設備'];
  for(const c of o.clients){c.name=take(clients);const scale=pick([.8,1,1.2]);c.value=c.value.map(v=>Math.round(v*scale));c.relation=pick([60,72,82]);}
  const inquiry=take(clients),profiles=o.team.map(()=>structuredClone(pick(config.peopleProfiles)));
  const relation=originId==='independent'?'前職で一緒に案件を担当した仲間':originId==='builders'?'共同制作を続けてきた仲間':'地域の勉強会で出会った仲間';
  const summary=originId==='independent'?`${count?'元同僚と':'ひとりで'}独立。仕事はあるが、${o.clients[0].name}への依存が大きい。`:originId==='builders'?`${count+1}人で技術を持ち寄って創業。作る力はあるが、継続顧客はまだいない。`:`地元の取引に支えられて${count+1}人で創業。信頼はあるが、手元資金には余裕がない。`;
  o.region=region.name;o.headline=summary;o.description=`${founder}が${region.name}で開業。${count?o.team.join('・')+'は'+relation+'。':'最初はひとりで仕事を回す。'}${o.clients.length?o.clients.map(c=>c.name).join('・')+'が最初の取引先。':inquiry+'から最初の試作相談が届いている。'}`;
  o.tension=originId==='independent'?`${o.clients[0].name}に仕事が集中している`:originId==='builders'?'継続契約がない間も、仲間の報酬と固定費が続く':'大きな支出や入金遅延に備える資金が薄い';
  recipe=config.encounter={version:1,originId,founder,region:region.name,relation,profiles,inquiry,summary,company:pick(['こもれび','つむぎ','あおば','みなと','ひより','しるべ'])+pick(['ソフト','システム','工房','開発室'])};
 }
 const s=create(seed,name||recipe.company,config,recipe.originId);s.founder={name:recipe.founder};s.encounter=structuredClone(recipe);
 s.people.forEach((p,i)=>{p.profile=structuredClone(recipe.profiles[i]);p.relationship=recipe.relation;});
 if(s.originId==='builders'&&s.contacts[0])s.contacts[0].name=recipe.inquiry;
 s.initial.people=structuredClone(s.people);return s;
}
