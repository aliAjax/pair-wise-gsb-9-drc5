import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const KEY='evidence-desk-v1';
const ST={pending:'待采用',adopted:'已采用',retracted:'已撤销'};
const fmt=t=>new Date(t).toLocaleString('zh-CN',{hour12:false});
const DAY=86400000,T0=Date.now();

const seedPapers=[
 {id:1,title:'The Extended Mind',authors:'Clark, A. & Chalmers, D.',year:1998,venue:'Analysis',totalPages:18,tags:['具身认知','经典'],abstract:'本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',status:'阅读中',cite:'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.'},
 {id:2,title:'Situated Learning',authors:'Lave, J. & Wenger, E.',year:1991,venue:'Cambridge University Press',totalPages:138,tags:['学习科学','社会'],abstract:'学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',status:'待读',cite:'Lave, J. & Wenger, E. (1991). Situated Learning.'},
 {id:3,title:'Designing with Data',authors:'Miller, S.',year:2022,venue:'MIT Press',totalPages:296,tags:['设计研究','方法'],abstract:'一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',status:'已读',cite:'Miller, S. (2022). Designing with Data.'}
];
const seedExcerpts=[
 {id:101,paperId:1,page:8,text:'The human organism is linked with an external entity in a two-way interaction, creating a coupled system that can be seen as a cognitive system in its own right.',cites:2,createdAt:T0-3*DAY,versions:[{v:1,status:'pending',at:T0-3*DAY},{v:2,status:'adopted',at:T0-2*DAY}]},
 {id:102,paperId:1,page:10,text:'Otto’s notebook plays the role usually played by biological memory; the information in it functions just like the information constituting an ordinary non-occurrent belief.',cites:1,createdAt:T0-3*DAY,versions:[{v:1,status:'pending',at:T0-3*DAY},{v:2,status:'adopted',at:T0-2*DAY},{v:3,status:'retracted',reason:'与第 8 页摘录论点重复，保留表述更完整的一条',at:T0-DAY}]},
 {id:103,paperId:2,page:29,text:'Learning is a process of participation in communities of practice, participation that is at first legitimately peripheral but that increases gradually in engagement and complexity.',cites:1,createdAt:T0-2*DAY,versions:[{v:1,status:'pending',at:T0-2*DAY}]},
 {id:104,paperId:3,page:312,text:'Designers treat evidence as material: every insight must be traceable to a source before it can shape a decision.',cites:1,createdAt:T0-DAY,versions:[{v:1,status:'pending',at:T0-DAY}]}
];

const load=()=>{try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.papers)&&Array.isArray(d.excerpts))return d}catch(e){}return{papers:seedPapers,excerpts:seedExcerpts}};
const curOf=e=>e.versions[e.versions.length-1];

function App(){
 const[db,setDb]=useState(load);
 const[selected,setSelected]=useState(null);
 const[query,setQuery]=useState('');
 const[tag,setTag]=useState('全部');
 const[show,setShow]=useState(false);
 const[notice,setNotice]=useState('');
 const[form,setForm]=useState({title:'',authors:'',year:'2026',venue:'',abstract:'',tags:'',totalPages:''});
 const[exForm,setExForm]=useState({page:'',text:''});
 const[retracting,setRetracting]=useState(null);
 const[reason,setReason]=useState('');
 const[openChains,setOpenChains]=useState({});

 const papers=db.papers,excerpts=db.excerpts;
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}},[db]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(t)},[notice]);
 useEffect(()=>{setExForm({page:'',text:''});setRetracting(null);setReason('')},[selected]);

 const setPapers=fn=>setDb(d=>({...d,papers:fn(d.papers)}));
 const setExcerpts=fn=>setDb(d=>({...d,excerpts:fn(d.excerpts)}));
 const paperOf=id=>papers.find(p=>p.id===id);
 const exCount=id=>excerpts.filter(e=>e.paperId===id).length;
 const adoptedN=excerpts.filter(e=>curOf(e).status==='adopted').length;
 const retractedN=excerpts.filter(e=>curOf(e).status==='retracted').length;

 const tags=['全部',...new Set(papers.flatMap(x=>x.tags))];
 const filtered=useMemo(()=>papers.filter(x=>(tag==='全部'||x.tags.includes(tag))&&(`${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase()))),[papers,tag,query]);
 const cur=papers.find(x=>x.id===selected)||papers[0];
 const curExcerpts=useMemo(()=>cur?excerpts.filter(e=>e.paperId===cur.id).sort((a,b)=>a.page-b.page||a.createdAt-b.createdAt):[],[excerpts,cur]);

 const update=(k,v)=>cur&&setPapers(ps=>ps.map(x=>x.id===cur.id?{...x,[k]:v}:x));
 const setTotalPages=v=>{const n=parseInt(v,10);if(Number.isInteger(n)&&n>=1)setPapers(ps=>ps.map(p=>p.id===cur.id?{...p,totalPages:n}:p))};

 const add=()=>{
  if(!form.title.trim())return setNotice('请填写文献标题');
  const tp=parseInt(form.totalPages,10);
  if(!Number.isInteger(tp)||tp<1)return setNotice('请填写有效的总页数（≥1）');
  const p={id:Date.now(),title:form.title.trim(),authors:form.authors.trim(),year:+form.year||new Date().getFullYear(),venue:form.venue.trim(),abstract:form.abstract.trim(),tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean),totalPages:tp,status:'待读',cite:`${form.authors} (${form.year}). ${form.title}. ${form.venue}.`};
  setPapers(ps=>[...ps,p]);setSelected(p.id);
  setForm({title:'',authors:'',year:'2026',venue:'',abstract:'',tags:'',totalPages:''});
  setShow(false);setNotice('文献已加入研究库');
 };

 // 新增摘录：必须绑定文献 + 起始页 + 原文；同文献同页码同原文只合并引用次数
 const addExcerpt=()=>{
  if(!cur)return;
  const page=parseInt(exForm.page,10);
  const text=exForm.text.trim();
  if(!Number.isInteger(page)||page<1)return setNotice('请填写有效的起始页码（≥1）');
  if(!text)return setNotice('原文不能为空：每条摘录必须绑定原文');
  const dup=excerpts.find(e=>e.paperId===cur.id&&e.page===page&&e.text.trim()===text);
  if(dup){
   setExcerpts(es=>es.map(e=>e.id===dup.id?{...e,cites:e.cites+1}:e));
   setExForm({page:'',text:''});
   return setNotice(`已存在相同页码与原文的摘录，只合并引用次数（×${dup.cites+1}），未新建副本`);
  }
  const t=Date.now();
  setExcerpts(es=>[...es,{id:t,paperId:cur.id,page,text,cites:1,createdAt:t,versions:[{v:1,status:'pending',at:t}]}]);
  setExForm({page:'',text:''});
  setNotice(page>cur.totalPages?`摘录已保存；注意第 ${page} 页超出本文献总页数（${cur.totalPages} 页），不能标记已采用`:'摘录已保存');
 };

 // 标记已采用：页码超出总页数或原文为空时阻止
 const adopt=ex=>{
  const p=paperOf(ex.paperId);
  if(!ex.text.trim())return setNotice('原文为空，不能标记已采用');
  if(!p||ex.page<1||ex.page>p.totalPages)return setNotice(`第 ${ex.page} 页超出《${p?p.title:'未知文献'}》总页数（${p?p.totalPages:0} 页），不能标记已采用`);
  const t=Date.now();
  setExcerpts(es=>es.map(e=>e.id===ex.id?{...e,versions:[...e.versions,{v:e.versions.length+1,status:'adopted',at:t}]}:e));
  setNotice('已标记为已采用，版本链已追加记录');
 };

 // 撤销：不删除旧版本，只追加一条带原因的 retracted 版本
 const retract=ex=>{
  const r=reason.trim();
  if(!r)return setNotice('撤销必须填写原因，原因将写入新版本');
  const t=Date.now();
  setExcerpts(es=>es.map(e=>e.id===ex.id?{...e,versions:[...e.versions,{v:e.versions.length+1,status:'retracted',reason:r,at:t}]}:e));
  setRetracting(null);setReason('');
  setNotice('已生成带原因的撤销版本，旧摘录与采用状态仍可查询');
 };

 const bib=()=>{navigator.clipboard?.writeText(cur.cite);setNotice('引用文本已复制')};
 const download=()=>{
  const lines=['# 参考文献','',...papers.map(p=>p.cite),'','# 已采用证据摘录',''];
  const adopted=excerpts.filter(e=>curOf(e).status==='adopted');
  adopted.forEach(e=>{const p=paperOf(e.paperId);lines.push(`《${p?p.title:'未知文献'}》 第 ${e.page} 页 · 引用 ×${e.cites}`);lines.push(e.text);lines.push('')});
  if(!adopted.length)lines.push('（暂无）');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain'}));a.download='evidence.txt';a.click();
  setNotice('参考文献与已采用摘录已导出');
 };

 return <div className="app">
  <aside>
   <div className="logo"><span>∴</span> EVIDENCE</div>
   <div className="library-head"><span>文献证据摘录台</span><strong>{excerpts.length}<small> 条摘录</small></strong></div>
   <nav>
    <button className="active">▤ <span>所有文献</span><b>{papers.length}</b></button>
    <button>❡ <span>证据摘录</span><b>{excerpts.length}</b></button>
    <button>✓ <span>已采用</span><b>{adoptedN}</b></button>
    <button>↺ <span>已撤销</span><b>{retractedN}</b></button>
   </nav>
   <div className="side-tags"><small>标签</small>{tags.slice(1,5).map(t=><button onClick={()=>setTag(t)} key={t}># {t}</button>)}</div>
   <div className="side-foot"><button>⚙ 偏好设置</button><small>本地数据库 · 已同步</small></div>
  </aside>
  <main>
   <header>
    <div><span className="crumb">RESEARCH / EVIDENCE DESK</span><h1>所有文献</h1></div>
    <div className="actions"><button className="outline" onClick={download}>↓ 导出证据与引用</button><button className="primary" onClick={()=>setShow(true)}>＋ 添加文献</button></div>
   </header>
   <div className="toolbar">
    <div className="search">⌕<input placeholder="搜索标题、作者或摘要…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div>
    <div className="tag-filter">{tags.map(t=><button className={tag===t?'on':''} onClick={()=>setTag(t)} key={t}>{t}</button>)}</div>
   </div>
   <div className="body">
    <section className="paper-list">
     {filtered.map(p=><button className={'paper '+(cur&&cur.id===p.id?'selected':'')} onClick={()=>setSelected(p.id)} key={p.id}>
      <div className="paper-year">{p.year}</div>
      <div className="paper-copy"><h3>{p.title}</h3><p>{p.authors}</p><div>{p.tags.map(t=><span key={t}>#{t}</span>)}<em className="ex-count">{exCount(p.id)} 条摘录</em></div></div>
      <small className={'status '+p.status}>{p.status}</small>
     </button>)}
     {!filtered.length&&<div className="no-result">没有找到匹配的文献</div>}
    </section>
    <section className="detail">{cur&&<>
     <div className="detail-top"><span className="status reading">{cur.status}</span><button onClick={()=>setNotice('已加入收藏')}>☆ 收藏</button></div>
     <h2>{cur.title}</h2>
     <p className="authors">{cur.authors}</p>
     <div className="cite-actions">
      <button onClick={bib}>▣ 复制引用</button>
      <button onClick={()=>update('status',cur.status==='已读'?'待读':'已读')}>{cur.status==='已读'?'标记为待读':'标记为已读'}</button>
     </div>
     <div className="detail-section"><h4>摘要 <span>ABSTRACT</span></h4><p>{cur.abstract}</p></div>
     <div className="detail-section"><h4>出版信息 <span>PUBLICATION</span></h4>
      <div className="pub-grid">
       <div><small>出版物</small><strong>{cur.venue}</strong></div>
       <div><small>年份</small><strong>{cur.year}</strong></div>
       <div><small>总页数</small><input className="pages-input" type="number" min="1" value={cur.totalPages} onChange={e=>setTotalPages(e.target.value)}/></div>
      </div>
     </div>
     <div className="detail-section"><h4>证据摘录 <span>EVIDENCE · {curExcerpts.length} 条</span></h4>
      <div className="ex-form">
       <div className="ex-row">
        <label>起始页<input type="number" min="1" value={exForm.page} onChange={e=>setExForm({...exForm,page:e.target.value})} placeholder={`1–${cur.totalPages}`}/></label>
        <span className="ex-hint">本文献共 {cur.totalPages} 页 · 超页码或空原文不可采用</span>
       </div>
       <textarea rows="3" placeholder="粘贴原文摘录（必填，作为可追溯证据）…" value={exForm.text} onChange={e=>setExForm({...exForm,text:e.target.value})}/>
       <button className="primary" onClick={addExcerpt}>＋ 保存摘录</button>
      </div>
      {curExcerpts.map(ex=>{const st=curOf(ex);const over=ex.page>cur.totalPages;return(
       <div className={'ex-card '+(st.status==='retracted'?'retracted':'')} key={ex.id}>
        <div className="ex-head">
         <span className="ex-page">第 {ex.page} 页</span>
         <span className="ex-cites">引用 ×{ex.cites}</span>
         <span className={'ex-status '+st.status}>{ST[st.status]}</span>
         <span className="ex-ver">v{st.v} · 共 {ex.versions.length} 版</span>
         {over&&<span className="ex-warn">页码超出总页数</span>}
         {!ex.text.trim()&&<span className="ex-warn">原文缺失</span>}
        </div>
        <blockquote className="ex-text">{ex.text||'（原文为空）'}</blockquote>
        <div className="ex-actions">
         {st.status==='pending'&&<button onClick={()=>adopt(ex)}>✓ 标记已采用</button>}
         {st.status!=='retracted'&&<button onClick={()=>{setRetracting(ex.id);setReason('')}}>↺ 撤销摘录</button>}
         <button onClick={()=>setOpenChains(o=>({...o,[ex.id]:!o[ex.id]}))}>{openChains[ex.id]?'▾ 收起版本链':'▸ 版本链（'+ex.versions.length+'）'}</button>
        </div>
        {retracting===ex.id&&<div className="retract-box">
         <textarea rows="2" placeholder="撤销原因（必填，将写入新版本并永久保留）…" value={reason} onChange={e=>setReason(e.target.value)}/>
         <div className="row"><button className="danger" onClick={()=>retract(ex)}>确认撤销并生成新版本</button><button className="plain" onClick={()=>setRetracting(null)}>取消</button></div>
        </div>}
        {openChains[ex.id]&&<div className="chain">
         {[...ex.versions].reverse().map(v=><div className="chain-item" key={v.v}>
          <span className="v">v{v.v}</span><span className={'ex-status '+v.status}>{ST[v.status]}</span><span>{fmt(v.at)}</span>{v.reason&&<span className="reason">原因：{v.reason}</span>}
         </div>)}
        </div>}
       </div>)})}
      {!curExcerpts.length&&<div className="no-result" style={{padding:'24px 10px'}}>还没有摘录，从上方添加第一条证据</div>}
     </div>
     <div className="detail-section"><h4>引用文本 <span>BIBTEX / TEXT</span></h4><div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div></div>
     <div className="detail-section"><h4>我的笔记 <span>PRIVATE</span></h4><textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes||''} onChange={e=>update('notes',e.target.value)}/></div>
    </>}</section>
   </div>
  </main>
  {show&&<div className="modal-bg"><div className="modal">
   <button className="close" onClick={()=>setShow(false)}>×</button>
   <span className="crumb">NEW REFERENCE</span><h2>添加一篇文献</h2>
   <label>标题<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="论文或书籍标题"/></label>
   <label>作者<input value={form.authors} onChange={e=>setForm({...form,authors:e.target.value})}/></label>
   <div className="two">
    <label>年份<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label>
    <label>总页数<input type="number" min="1" value={form.totalPages} onChange={e=>setForm({...form,totalPages:e.target.value})} placeholder="如 296"/></label>
   </div>
   <label>出版物<input value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></label>
   <label>关键词<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="用逗号分隔"/></label>
   <label>摘要<textarea rows="3" value={form.abstract} onChange={e=>setForm({...form,abstract:e.target.value})}/></label>
   <button className="primary full" onClick={add}>保存文献</button>
  </div></div>}
  {notice&&<div className="toast">{notice}</div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
