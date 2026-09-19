import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const STORE_KEY = 'evidence-desk-v1';

const seedItems = [
  {id: 1, title: 'The Extended Mind', authors: 'Clark, A. & Chalmers, D.', year: 1998, venue: 'Analysis', totalPages: 19, tags: ['具身认知', '经典'], abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。', status: '阅读中', cite: 'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.'},
  {id: 2, title: 'Situated Learning', authors: 'Lave, J. & Wenger, E.', year: 1991, venue: 'Cambridge University Press', totalPages: 138, tags: ['学习科学', '社会'], abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。', status: '待读', cite: 'Lave, J. & Wenger, E. (1991). Situated Learning.'},
  {id: 3, title: 'Designing with Data', authors: 'Miller, S.', year: 2022, venue: 'MIT Press', totalPages: 320, tags: ['设计研究', '方法'], abstract: '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。', status: '已读', cite: 'Miller, S. (2022). Designing with Data.'},
];

const seedExcerpts = [
  {id: 101, literatureId: 1, page: 10, citeCount: 3,
   text: 'Where does the mind stop and the rest of the world begin?',
   versions: [
     {v: 1, action: 'created', adopted: false, at: '2026-09-10T09:20:00.000Z'},
     {v: 2, action: 'adopted', adopted: true, at: '2026-09-10T09:26:00.000Z'},
   ]},
  {id: 102, literatureId: 1, page: 25, citeCount: 1,
   text: 'The coupling between organism and environment is constitutive of cognition.',
   versions: [
     {v: 1, action: 'created', adopted: false, at: '2026-09-12T14:02:00.000Z'},
   ]},
  {id: 103, literatureId: 2, page: 45, citeCount: 2,
   text: 'Learning is an integral part of generative social practice in the lived-in world.',
   versions: [
     {v: 1, action: 'created', adopted: false, at: '2026-09-11T10:00:00.000Z'},
     {v: 2, action: 'adopted', adopted: true, at: '2026-09-11T10:31:00.000Z'},
     {v: 3, action: 'revoked', adopted: false, reason: '与当前章节论点关联不足，改用一手访谈材料', at: '2026-09-15T16:40:00.000Z'},
   ]},
  {id: 104, literatureId: 3, page: 112, citeCount: 2,
   text: 'Designers convert qualitative insight into action by framing decisions explicitly.',
   versions: [
     {v: 1, action: 'created', adopted: false, at: '2026-09-13T08:12:00.000Z'},
   ]},
];

const now = () => new Date().toISOString();
const uid = () => Date.now() + Math.floor(Math.random() * 1e6);
const fmt = iso => new Date(iso).toLocaleString('zh-CN', {hour12: false});
const norm = s => (s || '').trim().replace(/\s+/g, ' ');
const ACTION = {created: '创建', adopted: '标记采用', unadopted: '取消采用', revoked: '撤销'};

// 摘录的当前状态由版本链最后一个版本决定，历史版本永不修改
const curV = e => e.versions[e.versions.length - 1];
const isRevoked = e => curV(e).action === 'revoked';
const isAdopted = e => !isRevoked(e) && !!curV(e).adopted;
// 返回不能标记采用的原因；返回空串表示可以采用
const blockReason = (e, lit) => {
  if (!norm(e.text)) return '原文为空，不能标记已采用';
  if (!lit || !Number.isInteger(e.page) || e.page < 1 || e.page > lit.totalPages)
    return `页码超出总页数（共 ${lit ? lit.totalPages : 0} 页），不能标记已采用`;
  return '';
};

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.items) && Array.isArray(s.excerpts) &&
        s.items.every(i => Number.isInteger(i.totalPages)) &&
        s.excerpts.every(e => Array.isArray(e.versions) && e.versions.length)) return s;
  } catch {}
  return {items: seedItems, excerpts: seedExcerpts};
}

const emptyForm = {title: '', authors: '', year: '2026', venue: '', totalPages: '', abstract: '', tags: ''};

function App() {
  const [db] = useState(load);
  const [items, setItems] = useState(db.items);
  const [excerpts, setExcerpts] = useState(db.excerpts);
  const [selected, setSelected] = useState(items[0] && items[0].id);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [exForm, setExForm] = useState({page: '', text: ''});
  const [revoking, setRevoking] = useState(null);
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState({});

  // 文献、摘录、版本链、引用次数整体持久化，刷新后保持一致
  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify({items, excerpts})); }, [items, excerpts]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => { setExForm({page: '', text: ''}); setRevoking(null); setReason(''); }, [selected]);

  const tags = ['全部', ...new Set(items.flatMap(x => x.tags))];
  const filtered = useMemo(() => items.filter(x => (tag === '全部' || x.tags.includes(tag)) && (`${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase()))), [items, tag, query]);
  const cur = items.find(x => x.id === selected) || items[0];
  const curExcerpts = useMemo(() => excerpts.filter(e => cur && e.literatureId === cur.id).sort((a, b) => a.page - b.page || a.id - b.id), [excerpts, cur]);
  const adoptedCount = excerpts.filter(isAdopted).length;
  const exCountOf = id => excerpts.filter(e => e.literatureId === id);

  const update = (k, v) => setItems(items.map(x => x.id === cur.id ? {...x, [k]: v} : x));
  const pushVersion = (id, v) => setExcerpts(excerpts.map(e => e.id === id
    ? {...e, versions: [...e.versions, {v: e.versions.length + 1, at: now(), ...v}]}
    : e));

  const add = () => {
    if (!norm(form.title)) return setNotice('请填写文献标题');
    const tp = parseInt(form.totalPages, 10);
    if (!Number.isInteger(tp) || tp < 1) return setNotice('请填写有效的总页数（正整数）');
    const p = {...form, id: uid(), year: +form.year || new Date().getFullYear(), totalPages: tp,
      tags: form.tags.split(',').map(x => x.trim()).filter(Boolean), status: '待读',
      cite: `${form.authors} (${form.year}). ${form.title}. ${form.venue}.`};
    setItems([...items, p]);
    setSelected(p.id);
    setForm(emptyForm);
    setShow(false);
    setNotice('文献已加入研究库');
  };

  // 同文献中页码和原文都相同的摘录只合并引用次数，不新建副本
  const addExcerpt = () => {
    if (!cur) return;
    const page = parseInt(exForm.page, 10);
    const text = norm(exForm.text);
    if (!Number.isInteger(page) || page < 1) return setNotice('请填写有效的起始页（正整数）');
    if (!text) return setNotice('请填写摘录原文');
    const dup = excerpts.find(e => e.literatureId === cur.id && e.page === page && norm(e.text) === text);
    if (dup) {
      setExcerpts(excerpts.map(e => e.id === dup.id ? {...e, citeCount: e.citeCount + 1} : e));
      setExForm({page: '', text: ''});
      return setNotice(`已存在相同摘录，引用次数合并为 ${dup.citeCount + 1}`);
    }
    const ex = {id: uid(), literatureId: cur.id, page, text, citeCount: 1,
      versions: [{v: 1, action: 'created', adopted: false, at: now()}]};
    setExcerpts([...excerpts, ex]);
    setExForm({page: '', text: ''});
    setNotice(page > cur.totalPages ? `摘录已保存；页码超出总页数（共 ${cur.totalPages} 页），暂不能标记采用` : '摘录已保存');
  };

  const toggleAdopt = e => {
    if (isRevoked(e)) return setNotice('已撤销的摘录不能再标记采用');
    if (isAdopted(e)) {
      pushVersion(e.id, {action: 'unadopted', adopted: false});
      return setNotice('已取消采用');
    }
    const block = blockReason(e, items.find(i => i.id === e.literatureId));
    if (block) return setNotice(block);
    pushVersion(e.id, {action: 'adopted', adopted: true});
    setNotice('已标记为采用');
  };

  // 撤销不删除摘录，只追加一条带原因的新版本，旧版本与采用状态保留可查
  const confirmRevoke = e => {
    const r = norm(reason);
    if (!r) return setNotice('撤销必须填写原因');
    pushVersion(e.id, {action: 'revoked', adopted: false, reason: r});
    setRevoking(null);
    setReason('');
    setNotice('已生成撤销版本，原摘录保留可查');
  };

  const bib = () => { navigator.clipboard?.writeText(cur.cite); setNotice('引用文本已复制'); };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([items.map(x => x.cite).join('\n')], {type: 'text/plain'}));
    a.download = 'references.txt';
    a.click();
    setNotice('引用列表已导出');
  };

  return <div className="app">
    <aside>
      <div className="logo"><span>∴</span> EVIDENCE</div>
      <div className="library-head"><span>证据摘录台</span><strong>{excerpts.length}<small> 条摘录</small></strong></div>
      <nav>
        <button className="active">▤ <span>所有文献</span><b>{items.length}</b></button>
        <button>❝ <span>证据摘录</span><b>{excerpts.length}</b></button>
        <button>✓ <span>已采用</span><b>{adoptedCount}</b></button>
        <button>✕ <span>已撤销</span><b>{excerpts.filter(isRevoked).length}</b></button>
      </nav>
      <div className="side-tags"><small>标签</small>{tags.slice(1, 5).map(t => <button onClick={() => setTag(t)} key={t}># {t}</button>)}</div>
      <div className="side-foot"><button>⚙ 偏好设置</button><small>本地数据库 · 已同步</small></div>
    </aside>
    <main>
      <header>
        <div><span className="crumb">RESEARCH / EVIDENCE DESK</span><h1>所有文献</h1></div>
        <div className="actions">
          <button className="outline" onClick={download}>↓ 导出引用</button>
          <button className="primary" onClick={() => setShow(true)}>＋ 添加文献</button>
        </div>
      </header>
      <div className="toolbar">
        <div className="search">⌕<input placeholder="搜索标题、作者或摘要…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button onClick={() => setQuery('')}>×</button>}</div>
        <div className="tag-filter">{tags.map(t => <button className={tag === t ? 'on' : ''} onClick={() => setTag(t)} key={t}>{t}</button>)}</div>
      </div>
      <div className="body">
        <section className="paper-list">
          {filtered.map(p => {
            const exs = exCountOf(p.id);
            return <button className={'paper ' + (selected === p.id ? 'selected' : '')} onClick={() => setSelected(p.id)} key={p.id}>
              <div className="paper-year">{p.year}</div>
              <div className="paper-copy">
                <h3>{p.title}</h3>
                <p>{p.authors}</p>
                <div>{p.tags.map(t => <span key={t}>#{t}</span>)}</div>
                <div className="ex-meta">❝ {exs.length} 条摘录 · 已采用 {exs.filter(isAdopted).length}</div>
              </div>
              <small className={'status ' + p.status}>{p.status}</small>
            </button>;
          })}
          {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
        </section>
        <section className="detail">
          {cur && <>
            <div className="detail-top">
              <span className="status reading">{cur.status}</span>
              <button onClick={() => setNotice('已加入收藏')}>☆ 收藏</button>
            </div>
            <h2>{cur.title}</h2>
            <p className="authors">{cur.authors}</p>
            <div className="cite-actions">
              <button onClick={bib}>▣ 复制引用</button>
              <button onClick={() => update('status', cur.status === '已读' ? '待读' : '已读')}>{cur.status === '已读' ? '标记为待读' : '标记为已读'}</button>
            </div>
            <div className="detail-section">
              <h4>摘要 <span>ABSTRACT</span></h4>
              <p>{cur.abstract}</p>
            </div>
            <div className="detail-section">
              <h4>出版信息 <span>PUBLICATION</span></h4>
              <div className="pub-grid">
                <div><small>出版物</small><strong>{cur.venue}</strong></div>
                <div><small>年份</small><strong>{cur.year}</strong></div>
                <div><small>总页数</small><input className="tp-input" type="number" min="1" value={cur.totalPages}
                  onChange={e => update('totalPages', Math.max(1, parseInt(e.target.value, 10) || 1))}/></div>
              </div>
            </div>
            <div className="detail-section">
              <h4>证据摘录 <span>TRACEABLE EXCERPTS</span>
                {curExcerpts.length > 0 && <em>{curExcerpts.length} 条 · 已采用 {curExcerpts.filter(isAdopted).length}</em>}
              </h4>
              <div className="ex-form">
                <div className="ex-row">
                  <label className="ex-page">起始页
                    <input type="number" min="1" placeholder="页码" value={exForm.page} onChange={e => setExForm({...exForm, page: e.target.value})}/>
                  </label>
                  <span className="ex-hint">本文献共 {cur.totalPages} 页</span>
                </div>
                <label>原文
                  <textarea rows="3" placeholder="粘贴文献原文…" value={exForm.text} onChange={e => setExForm({...exForm, text: e.target.value})}/>
                </label>
                <button className="primary full" onClick={addExcerpt}>＋ 保存摘录</button>
              </div>
              <div className="ex-list">
                {curExcerpts.map(e => {
                  const rv = isRevoked(e), ad = isAdopted(e);
                  const block = blockReason(e, cur);
                  return <div className={'ex-card' + (rv ? ' revoked' : '')} key={e.id}>
                    <div className="ex-head">
                      <span className="pg">P.{e.page}</span>
                      <span>引用 ×{e.citeCount}</span>
                      {rv ? <span className="badge revoked">已撤销</span>
                          : ad ? <span className="badge adopted">已采用</span>
                               : <span className="badge pending">未采用</span>}
                      {!rv && block && <span className="badge warn">⚠ {block}</span>}
                      <span className="ex-v">v{e.versions.length}</span>
                    </div>
                    <blockquote className="ex-text">{e.text}</blockquote>
                    {rv && <p className="ex-revoke-reason">撤销原因：{curV(e).reason}（{fmt(curV(e).at)}）</p>}
                    <div className="ex-actions">
                      {!rv && <>
                        <button disabled={!ad && !!block} title={!ad ? block : ''} onClick={() => toggleAdopt(e)}>{ad ? '取消采用' : '标记采用'}</button>
                        <button className="danger" onClick={() => {setRevoking(e.id); setReason('');}}>撤销…</button>
                      </>}
                      <button onClick={() => setOpen({...open, [e.id]: !open[e.id]})}>{open[e.id] ? '收起版本链' : `版本链（v1–v${e.versions.length}）`}</button>
                    </div>
                    {revoking === e.id && !rv && <div className="revoke-box">
                      <input autoFocus placeholder="填写撤销原因（必填）" value={reason} onChange={ev => setReason(ev.target.value)}/>
                      <button className="danger" onClick={() => confirmRevoke(e)}>确认撤销</button>
                      <button onClick={() => setRevoking(null)}>取消</button>
                    </div>}
                    {open[e.id] && <ol className="chain">
                      {e.versions.map(v => <li key={v.v}>
                        <b>v{v.v} · {ACTION[v.action]}</b>
                        <span>{fmt(v.at)} · 采用状态：{v.adopted ? '已采用' : '未采用'}</span>
                        {v.reason && <em>原因：{v.reason}</em>}
                      </li>)}
                    </ol>}
                  </div>;
                })}
                {!curExcerpts.length && <div className="no-result">还没有摘录，从上方添加第一条证据</div>}
              </div>
            </div>
            <div className="detail-section">
              <h4>引用文本 <span>BIBTEX / TEXT</span></h4>
              <div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div>
            </div>
            <div className="detail-section">
              <h4>我的笔记 <span>PRIVATE</span></h4>
              <textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes || ''} onChange={e => update('notes', e.target.value)}/>
            </div>
          </>}
        </section>
      </div>
    </main>
    {show && <div className="modal-bg"><div className="modal">
      <button className="close" onClick={() => setShow(false)}>×</button>
      <span className="crumb">NEW REFERENCE</span>
      <h2>添加一篇文献</h2>
      <label>标题<input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="论文或书籍标题"/></label>
      <label>作者<input value={form.authors} onChange={e => setForm({...form, authors: e.target.value})}/></label>
      <div className="two">
        <label>年份<input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})}/></label>
        <label>总页数<input type="number" min="1" value={form.totalPages} onChange={e => setForm({...form, totalPages: e.target.value})} placeholder="如 240"/></label>
      </div>
      <label>出版物<input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})}/></label>
      <label>关键词<input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="用逗号分隔"/></label>
      <label>摘要<textarea rows="3" value={form.abstract} onChange={e => setForm({...form, abstract: e.target.value})}/></label>
      <button className="primary full" onClick={add}>保存文献</button>
    </div></div>}
    {notice && <div className="toast">{notice}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
