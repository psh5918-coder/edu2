/* Local, dependency-free dashboard. Source data is generated from the supplied workbook. */
'use strict';
const DATA=window.BUDGET_DATA.rows;
const COLORS={'전력운영':'#6876ed','방위력개선':'#a075e9','병무행정':'#27bca5'};
const PALETTE=['#6876ed','#a075e9','#26bca5','#f3b94e','#f28398'];
const state={sector:'',account:'',includeAdjustments:true,year:2027,search:'',sort:'y2027',direction:-1};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d=0)=>Number(v).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d});
const signed=v=>(v>0?'+':'')+num(v);
const pct=v=>v===null||!Number.isFinite(v)?'—':`${v>0?'+':''}${num(v*100,1)}%`;
const compact=v=>Math.abs(v)>=10000?`${num(v/10000,1)}조`:`${num(v)}억`;
const unit=v=>Math.abs(v)>=10000?`${num(v/10000,2)}조`:`${num(v)}억`;
const sum=(rows,key)=>rows.reduce((a,r)=>a+r[key],0);
const groupBy=(rows,key)=>Array.from(rows.reduce((m,r)=>{const k=typeof key==='function'?key(r):r[key];const x=m.get(k)||{name:k,y2026:0,y2027:0,change:0,count:0};x.y2026+=r.y2026;x.y2027+=r.y2027;x.change+=r.change;x.count++;m.set(k,x);return m;},new Map()).values());
function selectedRows(){return DATA.filter(r=>(!state.sector||r.sector===state.sector)&&(!state.account||r.account===state.account)&&(state.includeAdjustments||!r.adjustment));}
function tableRows(rows){const term=state.search.toLocaleLowerCase();return rows.filter(r=>!term||[r.program,r.group,r.sector,r.account].some(v=>v.toLocaleLowerCase().includes(term))).sort((a,b)=>{const x=a[state.sort],y=b[state.sort];return state.direction*(typeof x==='number'?x-y:String(x).localeCompare(String(y),'ko'));});}
const empty=(id,message='선택 조건에 해당하는 데이터가 없습니다')=>{$(id).innerHTML=`<div class="empty-state"><strong>∅</strong><span>${esc(message)}</span></div>`;};
const svg=(body,w=700,h=260)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
const txt=(x,y,text,cls='value-label',extra='')=>`<text x="${x}" y="${y}" class="${cls}" ${extra}>${esc(text)}</text>`;
const tip=s=>`data-tip="${esc(s)}"`;
const line=(x1,y1,x2,y2,cls='grid')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const trim=(s,n=14)=>s.length>n?s.slice(0,n-1)+'…':s;
const chartWidth=(id,fallback=700)=>Math.max(360,$(id).clientWidth||fallback);

function updateAccountOptions(){
 const options=[...new Set(DATA.filter(r=>!state.sector||r.sector===state.sector).map(r=>r.account))];
 if(!options.includes(state.account))state.account='';
 $('account').innerHTML='<option value="">전체 회계구분</option>'+options.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');$('account').value=state.account;
}
function renderKpis(rows){
 const a=sum(rows,'y2026'),b=sum(rows,'y2027'),delta=b-a,rate=a?delta/a:null;
 const plus=rows.filter(r=>!r.adjustment&&r.change>0).length;
 const entries=[
  {label:'2026년 재원',value:num(a),suffix:'억원',note:'기준 연도 · 선택 항목 합계',color:'#6a75e9',tint:'#edefff',icon:'◷'},
  {label:'2027년 정부안',value:num(b),suffix:'억원',note:`${unit(b)}원 규모`,color:'#9c75e4',tint:'#f2ebfd',icon:'◈'},
  {label:'전년 대비 증감',value:signed(delta),suffix:'억원',note:`<span class="mini-change">${pct(rate)}</span>2026년 대비`,color:delta>=0?'#12ad92':'#ed6f87',tint:delta>=0?'#e4f8f1':'#ffedf0',icon:'↗'},
  {label:'선택 항목',value:String(rows.length),suffix:'개',note:`증액 프로그램 ${plus}개 · 차감 항목 ${rows.filter(r=>r.adjustment).length}개`,color:'#dba33c',tint:'#fff5df',icon:'▦'}
 ];
 $('kpis').innerHTML=entries.map(k=>`<article class="kpi" style="--color:${k.color};--tint:${k.tint}"><div class="kpi-label">${k.label}<span class="kpi-icon">${k.icon}</span></div><div class="kpi-value">${k.value}<small>${k.suffix}</small></div><div class="kpi-note">${k.note}</div></article>`).join('');
}
function renderSector(rows){
 const groups=groupBy(rows,'sector');if(!groups.length)return empty('sector-chart');
 const W=chartWidth('sector-chart'),H=260,L=63,R=30,T=22,B=38,cw=(W-L-R)/groups.length;
 const low=Math.min(0,...groups.flatMap(g=>[g.y2026,g.y2027])),high=Math.max(0,...groups.flatMap(g=>[g.y2026,g.y2027]));
 const span=high-low||1;const y=v=>H-B-(v-low)/span*(H-B-T),zero=y(0);let body='';
 for(let i=0;i<=4;i++){const v=low+span*i/4;body+=line(L,y(v),W-R,y(v))+txt(L-10,y(v)+4,compact(v),'axis-label','text-anchor="end"');}
 groups.forEach((g,i)=>{const cx=L+cw*(i+.5);const bw=Math.min(62,cw*.25);[2026,2027].forEach((year,j)=>{const val=g['y'+year],top=Math.min(y(val),zero),height=Math.abs(y(val)-zero);body+=`<rect x="${cx+(j?5:-bw-5)}" y="${top}" width="${bw}" height="${Math.max(1,height)}" rx="5" fill="${j?'#6876ed':'#b6c7f7'}" ${tip(`${g.name} · ${year}년\n${num(val)}억원`)} />`;body+=txt(cx+(j?5:-bw-5)+bw/2,val>=0?top-8:top+height+13,compact(val),'value-label','text-anchor="middle"');});body+=txt(cx,H-10,g.name,'category-label','text-anchor="middle"');});
 $('sector-chart').innerHTML=svg(body,W,H);
}
function renderAccount(rows){
 const key='y'+state.year;const groups=groupBy(rows.filter(r=>r[key]>0),'account').sort((a,b)=>b[key]-a[key]);const total=sum(groups,key);
 if(!total)return empty('account-chart','선택 연도에 양수 재원이 없습니다');
 const radius=64,C=2*Math.PI*radius;let start=0;
 let body=`<circle cx="150" cy="93" r="${radius}" fill="none" stroke="#f1f3fa" stroke-width="23"/>`;
 groups.forEach((g,i)=>{const length=g[key]/total*C;body+=`<circle cx="150" cy="93" r="${radius}" fill="none" stroke="${PALETTE[i%PALETTE.length]}" stroke-width="23" stroke-dasharray="${Math.max(0,length-3)} ${C}" stroke-dashoffset="${-start}" transform="rotate(-90 150 93)" ${tip(`${g.name}\n${num(g[key])}억원 · ${num(g[key]/total*100,1)}%`)} />`;start+=length;});
 body+=`<text x="150" y="88" text-anchor="middle" fill="#263754" style="font-size:23px;font-weight:800">${unit(total)}</text><text x="150" y="110" text-anchor="middle" fill="#99a3b8" style="font-size:10px">양수 재원 합계</text>`;
 $('account-chart').innerHTML=`<div class="donut-wrap">${svg(body,300,185)}<div class="donut-legend">${groups.map((g,i)=>`<div><i style="background:${PALETTE[i%5]}"></i><span>${esc(g.name)}</span><strong>${num(g[key]/total*100,1)}%</strong></div>`).join('')}</div></div>`;
}
function renderRanking(rows){
 const key='y'+state.year,top=rows.filter(r=>r[key]>0).sort((a,b)=>b[key]-a[key]).slice(0,10);if(!top.length)return empty('ranking-chart','선택 연도에 양수 재원이 없습니다');
 const W=chartWidth('ranking-chart'),H=330,L=W<500?138:175,R=W<500?65:79,step=H/10,max=Math.max(...top.map(r=>r[key]));let body='';
 top.forEach((r,i)=>{const y=i*step+5,w=(W-L-R)*r[key]/max;body+=txt(L-12,y+17,trim(r.program,17),'category-label','text-anchor="end"');body+=`<rect x="${L}" y="${y}" width="${W-L-R}" height="23" rx="5" fill="#f4f5fb"/><rect x="${L}" y="${y}" width="${Math.max(2,w)}" height="23" rx="5" fill="${COLORS[r.sector]}" ${tip(`${r.program}\n${r.sector} / ${r.account}\n${state.year}년 ${num(r[key])}억원`)} />`;body+=txt(L+w+9,y+16,num(r[key]),'value-label');});
 $('ranking-chart').innerHTML=svg(body,W,H);
}
function renderShare(rows){
 const key='y'+state.year,groups=groupBy(rows.filter(r=>r[key]>0),'sector').sort((a,b)=>b[key]-a[key]),total=sum(groups,key);if(!total)return empty('share-chart','선택 연도에 양수 재원이 없습니다');
 $('share-chart').innerHTML=`<div class="share-list">${groups.map(g=>`<div ${tip(`${g.name}\n${num(g[key])}억원`)}><div class="share-row-top"><i style="background:${COLORS[g.name]}"></i><span>${esc(g.name)}</span><strong style="color:${COLORS[g.name]}">${num(g[key]/total*100,1)}<small style="font-size:11px">%</small></strong></div><div class="share-track"><div style="width:${g[key]/total*100}%;background:${COLORS[g.name]}"></div></div><div class="share-amount">${num(g[key])}억원 · ${g.count}개 항목</div></div>`).join('')}</div>`;
}
function partition(items,x,y,w,h,key,out=[]){
 if(!items.length)return out;
 if(items.length===1){out.push({...items[0],x,y,w,h});return out;}
 const total=sum(items,key);let acc=0,split=1;
 for(let i=0;i<items.length-1;i++){acc+=items[i][key];split=i+1;if(acc>=total/2)break;}
 const first=items.slice(0,split),second=items.slice(split);const f=sum(first,key)/total;
 if(w>=h){partition(first,x,y,w*f,h,key,out);partition(second,x+w*f,y,w*(1-f),h,key,out);}else{partition(first,x,y,w,h*f,key,out);partition(second,x,y+h*f,w,h*(1-f),key,out);}return out;
}
function renderMap(rows){
 const key='y'+state.year,positive=rows.filter(r=>r[key]>0).sort((a,b)=>b[key]-a[key]);if(!positive.length)return empty('treemap-chart','선택 연도에 양수 재원이 없습니다');
 const W=chartWidth('treemap-chart',1050),H=W<500?350:300,boxes=partition(positive,0,0,W,H,key);let body='';
 boxes.forEach((r,i)=>{const x=r.x+2,y=r.y+2,w=Math.max(0,r.w-4),h=Math.max(0,r.h-4),color=COLORS[r.sector];const maxChars=Math.floor((w-20)/11),label=trim(r.program,Math.max(2,maxChars));body+=`<g ${tip(`${r.program}\n${r.sector} / ${r.account}\n${num(r[key])}억원 · 양수 합계의 ${num(r[key]/sum(positive,key)*100,2)}%`)}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${color}" opacity="${.67+(i%4)*.1}"/>`;if(w>75&&h>44)body+=`<text x="${x+12}" y="${y+23}" fill="white" font-size="12" font-weight="600">${esc(label)}</text><text x="${x+12}" y="${y+42}" fill="white" opacity=".8" font-size="11">${num(r[key])}억</text>`;else if(w>48&&h>19)body+=`<text x="${x+7}" y="${y+15}" fill="white" font-size="9">${esc(trim(r.program,Math.floor(w/10)))}</text>`;body+='</g>';});
 $('treemap-chart').innerHTML=svg(body,W,H);
}
function renderChange(rows){
 const top=[...rows].sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,10);if(!top.length)return empty('change-chart');
 const W=chartWidth('change-chart'),H=330,L=W<500?138:180,R=W<500?65:75,low=Math.min(0,...top.map(r=>r.change)),high=Math.max(0,...top.map(r=>r.change)),span=high-low||1;
 const x=v=>L+(W-L-R)*(v-low)/span,zero=x(0),step=H/10;let body=line(zero,0,zero,H-5);
 top.forEach((r,i)=>{const y=i*step+5,xval=x(r.change),width=Math.abs(xval-zero);body+=txt(L-12,y+17,trim(r.program,17),'category-label','text-anchor="end"');body+=`<rect x="${Math.min(zero,xval)}" y="${y}" width="${Math.max(2,width)}" height="23" rx="4" fill="${r.change>=0?'#18b99b':'#f5738b'}" ${tip(`${r.program}\n증감 ${signed(r.change)}억원\n증감률 ${pct(r.rate)}`)} />`;body+=txt(W-5,y+16,signed(r.change),'value-label','text-anchor="end"');});
 $('change-chart').innerHTML=svg(body,W,H);
}
function renderContribution(rows){
 const groups=groupBy(rows,'sector').sort((a,b)=>b.change-a.change);if(!groups.length)return empty('contribution-chart');
 const W=320,H=330,L=55,R=20,T=25,B=68,low=Math.min(0,...groups.map(g=>g.change)),high=Math.max(0,...groups.map(g=>g.change)),span=high-low||1;
 const y=v=>H-B-(v-low)/span*(H-B-T),zero=y(0),cw=(W-L-R)/groups.length;let body='';
 for(let i=0;i<=4;i++){const val=low+span*i/4;body+=line(L,y(val),W-R,y(val))+txt(L-8,y(val)+4,compact(val),'axis-label','text-anchor="end"');}
 groups.forEach((g,i)=>{const cx=L+cw*(i+.5),top=Math.min(y(g.change),zero),height=Math.abs(y(g.change)-zero);body+=`<rect x="${cx-22}" y="${top}" width="44" height="${Math.max(1,height)}" rx="6" fill="${COLORS[g.name]}" ${tip(`${g.name}\n순 증감 ${signed(g.change)}억원`)} />`;body+=txt(cx,g.change>=0?top-9:top+height+15,signed(g.change),'value-label','text-anchor="middle"')+txt(cx,H-42,g.name,'category-label','text-anchor="middle"');});
 body+=txt(W/2,H-10,`합계 ${signed(sum(groups,'change'))}억원`,'value-label','text-anchor="middle"');$('contribution-chart').innerHTML=svg(body,W,H);
}
function renderScatter(rows){
 const items=rows.filter(r=>r.y2026>0&&r.y2027>0);if(!items.length)return empty('scatter-chart','양 연도 모두 양수인 프로그램이 없습니다');
 const W=chartWidth('scatter-chart'),H=260,L=67,R=25,T=23,B=43,max=Math.max(...items.flatMap(r=>[r.y2026,r.y2027]))*1.1;
 const x=v=>L+v/max*(W-L-R),y=v=>H-B-v/max*(H-B-T);let body='';
 for(let i=0;i<=4;i++){const val=max*i/4;body+=line(L,y(val),W-R,y(val))+line(x(val),T,x(val),H-B)+txt(L-9,y(val)+4,compact(val),'axis-label','text-anchor="end"')+txt(x(val),H-B+19,compact(val),'axis-label','text-anchor="middle"');}
 body+=`<line x1="${x(0)}" y1="${y(0)}" x2="${x(max)}" y2="${y(max)}" stroke="#a8b3cf" stroke-dasharray="5 5"/>`;
 items.sort((a,b)=>b.y2027-a.y2027).forEach(r=>{const rad=4+Math.sqrt(r.y2027/max)*13;body+=`<circle cx="${x(r.y2026)}" cy="${y(r.y2027)}" r="${rad}" fill="${COLORS[r.sector]}" fill-opacity=".65" stroke="white" stroke-width="1.5" ${tip(`${r.program}\n2026년 ${num(r.y2026)}억원\n2027년 ${num(r.y2027)}억원\n증감률 ${pct(r.rate)}`)} />`;});
 body+=txt(W-R,H-3,'2026년 →','axis-label','text-anchor="end"')+txt(L,T-9,'2027년 ↑','axis-label');$('scatter-chart').innerHTML=svg(body,W,H);
}
function renderGrowth(rows){
 const top=rows.filter(r=>r.y2026>0&&r.y2027>0).sort((a,b)=>b.rate-a.rate).slice(0,8);if(!top.length)return empty('growth-chart','양 연도 모두 양수인 프로그램이 없습니다');
 const W=360,H=260,L=141,R=47,T=8,step=31,low=Math.min(0,...top.map(r=>r.rate)),high=Math.max(0,...top.map(r=>r.rate)),span=high-low||1,x=v=>L+(W-L-R)*(v-low)/span,zero=x(0);let body=line(zero,0,zero,H-8);
 top.forEach((r,i)=>{const cy=T+i*step+9,color=r.rate>=0?'#9c78e9':'#f5738b';body+=txt(L-10,cy+4,trim(r.program,12),'category-label','text-anchor="end"')+`<line x1="${zero}" y1="${cy}" x2="${x(r.rate)}" y2="${cy}" stroke="${color}" stroke-width="4" stroke-opacity=".3"/><circle cx="${x(r.rate)}" cy="${cy}" r="5" fill="${color}" ${tip(`${r.program}\n${pct(r.rate)}\n증감 ${signed(r.change)}억원`)} />`+txt(x(r.rate)+9,cy+4,pct(r.rate),'value-label');});$('growth-chart').innerHTML=svg(body,W,H);
}
function renderMatrix(rows){
 if(!rows.length){$('matrix-chart').innerHTML='<div class="empty-state">선택 데이터가 없습니다</div>';return;}
 const groups=groupBy(rows,r=>`${r.sector}|${r.group||r.account}`).sort((a,b)=>b.y2027-a.y2027),max=Math.max(...groups.flatMap(g=>[Math.abs(g.y2026),Math.abs(g.y2027)]),1);
 $('matrix-chart').innerHTML=`<div class="matrix-row matrix-header" role="row"><span>부문 / 구분</span><span style="text-align:right">2026년</span><span style="text-align:right">2027년</span><span style="text-align:right">증감</span><span style="text-align:right">증감률</span></div>`+groups.map(g=>{const [sector,name]=g.name.split('|'),rate=g.y2026?g.change/g.y2026:null;return `<div class="matrix-row body" role="row"><div class="matrix-name" role="cell"><strong>${esc(name)}</strong><small>${esc(sector)} · ${g.count}개 항목</small></div>${['y2026','y2027'].map(k=>`<div class="matrix-cell" role="cell" style="background:rgba(104,118,237,${.04+Math.abs(g[k])/max*.21})">${num(g[k])}</div>`).join('')}<div class="matrix-cell ${g.change>=0?'positive':'negative'}" role="cell" style="background:${g.change>=0?'#eaf9f4':'#fff0f3'}">${signed(g.change)}</div><div class="matrix-cell" role="cell" style="background:#f6f4fc;color:#9675d2">${pct(rate)}</div></div>`;}).join('');
}
function renderTable(rows){
 const filtered=tableRows(rows);$('table-count').textContent=filtered.length+'개';
 $('table-body').innerHTML=filtered.length?filtered.map(r=>`<tr class="${r.adjustment?'adjust-row':''}"><td><span class="sector-label" style="background:${COLORS[r.sector]}14;color:${COLORS[r.sector]}">${esc(r.sector)}</span></td><td class="${r.adjustment?'account-adjust':''}">${esc(r.account)}</td><td>${esc(r.group)||'—'}</td><td class="program-cell">${r.adjustment?'—':esc(r.program)}</td><td class="num">${num(r.y2026)}</td><td class="num">${num(r.y2027)}</td><td class="num ${r.change>=0?'positive':'negative'}">${signed(r.change)}</td><td class="num"><span class="rate-badge ${r.rate>=0?'positive':'negative'}">${pct(r.rate)}</span></td></tr>`).join(''):'<tr><td colspan="8" style="text-align:center;padding:40px">검색 결과가 없습니다.</td></tr>';
 const a=sum(filtered,'y2026'),b=sum(filtered,'y2027');$('table-foot').textContent=`표에 표시된 ${filtered.length}개 항목 합계: 2026년 ${num(a)}억원 / 2027년 ${num(b)}억원 / 증감 ${signed(b-a)}억원`;
}
function render(){
 const rows=selectedRows();$('filter-count').textContent=rows.length+' / 32 항목';
 $('active-filters').innerHTML=`<span class="filter-chip">${esc(state.sector||'전체 부문')}</span><span class="filter-chip">${esc(state.account||'전체 회계구분')}</span><span class="filter-chip neutral">${state.includeAdjustments?'차감 포함':'차감 제외'}</span>`;
 document.querySelectorAll('.chart-year').forEach(el=>el.textContent=state.year+'년');
 document.querySelectorAll('.sector-legend').forEach(el=>el.innerHTML=Object.entries(COLORS).filter(([name])=>rows.some(r=>r.sector===name)).map(([name,color])=>`<span><i style="background:${color}"></i>${name}</span>`).join(''));
 renderKpis(rows);renderSector(rows);renderAccount(rows);renderRanking(rows);renderShare(rows);renderMap(rows);renderChange(rows);renderContribution(rows);renderScatter(rows);renderGrowth(rows);renderMatrix(rows);renderTable(rows);
 $('tooltip').style.display='none';
}
$('sector').innerHTML+=[...new Set(DATA.map(r=>r.sector))].map(s=>`<option>${esc(s)}</option>`).join('');updateAccountOptions();
$('sector').addEventListener('change',e=>{state.sector=e.target.value;updateAccountOptions();render();});
$('account').addEventListener('change',e=>{state.account=e.target.value;render();});
$('adjustments').addEventListener('change',e=>{state.includeAdjustments=e.target.checked;render();});
$('search').addEventListener('input',e=>{state.search=e.target.value;renderTable(selectedRows());});
document.querySelectorAll('[data-year]').forEach(button=>button.addEventListener('click',()=>{state.year=Number(button.dataset.year);document.querySelectorAll('[data-year]').forEach(b=>{const active=Number(b.dataset.year)===state.year;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});render();}));
$('reset').addEventListener('click',()=>{state.sector='';state.account='';state.includeAdjustments=true;state.search='';state.sort='y2027';state.direction=-1;state.year=2027;$('sector').value='';$('adjustments').checked=true;$('search').value='';updateAccountOptions();document.querySelectorAll('[data-year]').forEach(b=>{const active=Number(b.dataset.year)===2027;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});render();});
document.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.sort;if(state.sort===key)state.direction*=-1;else{state.sort=key;state.direction=typeof DATA[0][key]==='number'?-1:1;}document.querySelectorAll('th').forEach(th=>th.removeAttribute('aria-sort'));button.parentElement.setAttribute('aria-sort',state.direction===1?'ascending':'descending');renderTable(selectedRows());}));
document.querySelectorAll('.nav-item').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));a.classList.add('active');}));
$('export').addEventListener('click',()=>{
 const rows=tableRows(selectedRows());
 const csv=[['부문','회계구분','구분','프로그램명','2026년 (억원)','2027년 (억원)','증감 (억원)','증감률'],...rows.map(r=>[r.sector,r.account,r.group,r.adjustment?'':r.program,r.y2026,r.y2027,r.change,r.rate])].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
 const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`국방예산_${state.sector||'전체'}_${state.account||'전체회계'}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
document.addEventListener('pointermove',e=>{
 const target=e.target.closest('[data-tip]'),tooltip=$('tooltip');if(!target){tooltip.style.display='none';return;}tooltip.textContent=target.dataset.tip;tooltip.style.display='block';const box=tooltip.getBoundingClientRect();tooltip.style.left=Math.max(8,Math.min(e.clientX+15,window.innerWidth-box.width-10))+'px';tooltip.style.top=Math.max(8,Math.min(e.clientY+15,window.innerHeight-box.height-10))+'px';
});
document.addEventListener('scroll',()=>{$('tooltip').style.display='none';},{passive:true});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,150);});
render();
// Exposed read-only diagnostics for local verification.
window.dashboardDiagnostics=()=>({records:selectedRows().length,year:state.year,totals:{y2026:sum(selectedRows(),'y2026'),y2027:sum(selectedRows(),'y2027')},charts:document.querySelectorAll('.chart svg').length});
