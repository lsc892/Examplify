export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function lectureAnchor(lec) { return 'lec-' + String(lec).replace(/[^\w]/g, '-'); }

/** 이해할 개념: 표(개념 | 설명). */
export function renderConceptTable(L) {
  const rows = (L.이해할_개념 || []).map(c =>
    `<tr><th scope="row">${escapeHtml(c.term)}</th><td>${escapeHtml(c.explain)}</td></tr>`).join('');
  if (!rows) return '';
  return `<h3>이해할 개념</h3><table class="study concepts">`
    + `<thead><tr><th>개념</th><th>설명</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** 외울 것: 표(항목 | 내용). 팁은 내용 칸 아래에 배치. */
export function renderMemorizeTable(L) {
  const rows = (L.외울_것 || []).map(m => {
    const tip = m.tip ? `<div class="tip">팁: ${escapeHtml(m.tip)}</div>` : '';
    return `<tr><th scope="row">${escapeHtml(m.item)}</th>`
      + `<td><div class="content">${escapeHtml(m.content)}</div>${tip}</td></tr>`;
  }).join('');
  if (!rows) return '';
  return `<h3>외울 것</h3><table class="study memorize">`
    + `<thead><tr><th>항목</th><th>내용</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** 공식: 표(공식 | 수식 | 변수). 수식은 $...$ 로 감싸 KaTeX auto-render가 처리. */
export function renderFormulaTable(L) {
  const rows = (L.공식 || []).map(f =>
    `<tr><th scope="row">${escapeHtml(f.name)}</th>`
    + `<td>${escapeHtml('$' + f.tex + '$')}</td>`
    + `<td>${escapeHtml(f.vars || '')}</td></tr>`).join('');
  if (!rows) return '';
  return `<h3>공식</h3><table class="study formulas">`
    + `<thead><tr><th>공식</th><th>수식</th><th>변수</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** 핵심 그림: 분석에서 설명에 중요했던 PDF 그림/페이지를 캡션과 함께 보여준다.
 *  각 항목은 { src, caption, why? }. render.mjs가 src를 읽어 data URI(embed)로 채운다.
 *  embed(또는 src)가 없는 항목은 건너뛴다. */
export function renderFigures(L) {
  const figs = (L.그림 || []).filter(f => f && (f.embed || f.src));
  if (!figs.length) return '';
  const items = figs.map(f => {
    const src = escapeHtml(f.embed || f.src);
    const cap = escapeHtml(f.caption || '');
    const why = f.why ? `<span class="why"> — ${escapeHtml(f.why)}</span>` : '';
    return `<figure class="study-figure">`
      + `<img src="${src}" alt="${cap}" loading="lazy">`
      + `<figcaption>${cap}${why}</figcaption></figure>`;
  }).join('');
  return `<h3>핵심 그림</h3><div class="figures">${items}</div>`;
}

export function renderLectureSection(L) {
  return `<section id="${lectureAnchor(L.lecture)}" class="lecture">`
    + `<h2>${escapeHtml(L.lecture)} · ${escapeHtml(L.title)} <small>(${escapeHtml(L.topic)})</small></h2>`
    + renderConceptTable(L) + renderFigures(L) + renderMemorizeTable(L) + renderFormulaTable(L)
    + `</section>`;
}

export function renderToc(lectures) {
  const items = (lectures || []).map((L, i) => {
    const a = lectureAnchor(L.lecture);
    return `<li class="toc-item" data-anchor="${a}" data-idx="${i}">`
      + `<input type="checkbox" class="toc-check" data-anchor="${a}" aria-label="문제풀이에 포함">`
      + `<a href="#${a}">${escapeHtml(L.lecture)} ${escapeHtml(L.title)}</a></li>`;
  }).join('');
  return `<nav id="toc">`
    + `<input id="toc-filter" placeholder="검색...">`
    + `<ul id="toc-list">${items}</ul>`
    + `<div id="toc-selected-wrap" hidden><div class="toc-sel-head">✓ 선택한 강의</div><ul id="toc-selected"></ul></div>`
    + `<div id="toc-quiz"><button type="button" id="open-quiz">📝 문제풀이</button></div>`
    + `</nav>`;
}

/** 강의의 문제(선택)를 퀴즈용으로 정규화. 형식 불량 항목은 버린다. */
export function normalizeQuestions(L) {
  return (Array.isArray(L && L.문제) ? L.문제 : []).map(q => {
    if (!q || typeof q !== 'object') return null;
    const text = String(q.q ?? '');
    if (!text) return null;
    if (q.type === '주관식') {
      const answer = String(q.answer ?? '');
      if (!answer) return null;
      return { type: '주관식', q: text, answer, explain: q.explain ? String(q.explain) : '' };
    }
    const choices = Array.isArray(q.choices) ? q.choices.map(String) : [];
    if (choices.length < 2) return null;
    let answer = Number.isInteger(q.answer) ? q.answer : 0;
    if (answer < 0 || answer >= choices.length) answer = 0;
    return { type: '객관식', q: text, choices, answer, explain: q.explain ? String(q.explain) : '' };
  }).filter(Boolean);
}

/** 퀴즈 데이터: 강의별 {lecture,title,anchor,questions}. 페이지에 JSON으로 임베드된다. */
export function quizData(lectures) {
  return (lectures || []).map(L => ({
    lecture: L.lecture, title: L.title, anchor: lectureAnchor(L.lecture),
    questions: normalizeQuestions(L),
  }));
}

const CLIENT_JS = `
(function () {
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function shuffle(a){ a = a.slice(); for (var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function typeset(el){ if (window.renderMathInElement) { try { renderMathInElement(el, { delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}], throwOnError:false }); } catch(e){} } }
  function el(tag, cls, txt){ var n=document.createElement(tag); if(cls)n.className=cls; if(txt!=null)n.textContent=txt; return n; }

  ready(function () {
    typeset(document.body);

    // 목차 검색
    var f = document.getElementById('toc-filter');
    if (f) f.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      document.querySelectorAll('#toc-list li, #toc-selected li').forEach(function (li) {
        li.style.display = li.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none';
      });
    });

    // 목차 체크 → 하단 '선택한 강의'로 이동, 해제 → 원래 순서로 복귀
    var list = document.getElementById('toc-list');
    var selWrap = document.getElementById('toc-selected-wrap');
    var sel = document.getElementById('toc-selected');
    function placeInList(li){
      var idx = +li.getAttribute('data-idx'); var ref = null;
      list.querySelectorAll('li').forEach(function (n){ if (ref===null && +n.getAttribute('data-idx') > idx) ref = n; });
      list.insertBefore(li, ref);
    }
    document.querySelectorAll('.toc-check').forEach(function (cb){
      cb.addEventListener('change', function (){
        var li = cb.closest('li');
        if (cb.checked) sel.appendChild(li); else placeInList(li);
        selWrap.hidden = sel.children.length === 0;
      });
    });

    // 퀴즈 데이터
    var data = [];
    try { data = JSON.parse(document.getElementById('quiz-data').textContent); } catch(e){}
    var totalQ = data.reduce(function (s,d){ return s + d.questions.length; }, 0);

    var modal = document.getElementById('quiz-modal');
    if (!modal) return;
    var cfg = document.getElementById('quiz-config');
    var run = document.getElementById('quiz-run');
    var form = document.getElementById('quiz-form');
    var scopeInfo = document.getElementById('quiz-scope-info');
    var scopeChecked = document.getElementById('quiz-scope-checked');
    var countInput = document.getElementById('quiz-count');
    var emptyMsg = document.getElementById('quiz-empty');
    var startBtn = document.getElementById('quiz-start');
    var progress = document.getElementById('quiz-progress');
    var resultBox = document.getElementById('quiz-result');
    var gradeBtn = document.getElementById('quiz-grade');
    var retryBtn = document.getElementById('quiz-retry');

    function checkedAnchors(){ var s=[]; document.querySelectorAll('.toc-check:checked').forEach(function(cb){ s.push(cb.getAttribute('data-anchor')); }); return s; }
    function poolFor(useChecked){
      var anchors = checkedAnchors();
      var src = (useChecked && anchors.length) ? data.filter(function(d){ return anchors.indexOf(d.anchor) >= 0; }) : data;
      var pool = [];
      src.forEach(function(d){ d.questions.forEach(function(q){ var c = Object.assign({}, q); c._lec = d.lecture; pool.push(c); }); });
      return pool;
    }

    function updateScope(){
      var anchors = checkedAnchors();
      scopeChecked.disabled = anchors.length === 0;
      if (!anchors.length) scopeChecked.checked = false;
      var avail = poolFor(scopeChecked.checked).length;
      scopeInfo.textContent = '체크한 강의 ' + anchors.length + '개 · 출제 가능 ' + avail + '문제 (전체 ' + totalQ + ')';
      countInput.max = avail || 1;
      if (+countInput.value > avail) countInput.value = avail || 1;
      if (+countInput.value < 1) countInput.value = avail ? Math.min(10, avail) : 1;
      emptyMsg.hidden = avail > 0;
      startBtn.disabled = avail === 0;
    }

    function openModal(){
      scopeChecked.checked = checkedAnchors().length > 0;
      updateScope(); cfg.hidden=false; run.hidden=true; modal.hidden=false;
    }
    function closeModal(){ modal.hidden=true; }

    var openBtn = document.getElementById('open-quiz');
    if (openBtn) openBtn.addEventListener('click', openModal);
    modal.querySelector('.quiz-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !modal.hidden) closeModal(); });
    scopeChecked.addEventListener('change', updateScope);
    countInput.addEventListener('input', updateScope);

    var current = []; var tally = null;

    function renderQuestion(item, i){
      var card = el('div','q-card'); card.dataset.type = item.type;
      var head = el('div','q-head');
      head.appendChild(el('span','q-num', (i+1) + '.'));
      head.appendChild(el('span','q-tag ' + (item.type==='주관식'?'subj':'obj'), item.type));
      head.appendChild(el('span','q-src', item._lec || ''));
      card.appendChild(head);
      card.appendChild(el('div','q-body', item.q));

      if (item.type === '객관식'){
        item._correct = item.choices[item.answer];
        var opts = el('div','q-choices');
        shuffle(item.choices).forEach(function(choice){
          var label = el('label','q-choice');
          var radio = document.createElement('input');
          radio.type='radio'; radio.name='q'+i; radio.value=choice;
          label.appendChild(radio); label.appendChild(el('span', null, choice));
          opts.appendChild(label);
        });
        card.appendChild(opts);
      } else {
        var ta = document.createElement('textarea');
        ta.className='q-answer'; ta.rows=3; ta.placeholder='답안을 작성하세요...';
        card.appendChild(ta);
      }
      var fb = el('div','q-feedback'); fb.hidden=true; card.appendChild(fb);
      typeset(card);
      return card;
    }

    function startQuiz(){
      var pool = poolFor(scopeChecked.checked);
      var n = Math.max(1, Math.min(+countInput.value || 1, pool.length));
      current = shuffle(pool).slice(0, n);  // 전체 셔플 → 객관식·주관식 무작위 배치
      form.innerHTML='';
      current.forEach(function(item, i){ form.appendChild(renderQuestion(item, i)); });
      var nObj = current.filter(function(q){return q.type==='객관식';}).length;
      progress.textContent = '총 ' + current.length + '문제 · 객관식 ' + nObj + ' · 주관식 ' + (current.length - nObj);
      resultBox.hidden=true; resultBox.innerHTML=''; tally=null;
      gradeBtn.hidden=false; retryBtn.hidden=true;
      cfg.hidden=true; run.hidden=false;
      run.scrollTop = 0;
    }
    startBtn.addEventListener('click', startQuiz);
    retryBtn.addEventListener('click', function(){ openModal(); });

    function gradeQuiz(){
      var cards = form.querySelectorAll('.q-card');
      var objTotal=0, objRight=0, subjTotal=0;
      cards.forEach(function(card, i){
        var item = current[i];
        var fb = card.querySelector('.q-feedback'); fb.hidden=false; fb.innerHTML='';
        if (item.type === '객관식'){
          objTotal++;
          var picked = card.querySelector('input[name="q'+i+'"]:checked');
          var ok = !!picked && picked.value === item._correct;
          if (ok) objRight++;
          card.classList.add(ok ? 'right' : 'wrong');
          card.querySelectorAll('.q-choice').forEach(function(lab){
            var inp = lab.querySelector('input');
            if (inp.value === item._correct) lab.classList.add('is-correct');
            else if (inp.checked) lab.classList.add('is-wrong');
            inp.disabled = true;
          });
          fb.appendChild(el('div','fb-line ' + (ok?'ok':'no'), ok ? '정답' : '오답'));
          if (item.explain) fb.appendChild(el('div','fb-explain', '해설: ' + item.explain));
        } else {
          subjTotal++;
          var ta = card.querySelector('.q-answer'); if (ta) ta.readOnly = true;
          var model = el('div','fb-model');
          model.appendChild(el('strong', null, '모범답안'));
          model.appendChild(document.createElement('br'));
          model.appendChild(document.createTextNode(item.answer));
          fb.appendChild(model);
          if (item.explain) fb.appendChild(el('div','fb-explain', '해설: ' + item.explain));
          var sg = el('div','fb-selfgrade'); sg.appendChild(el('span','sg-label','자가채점:'));
          var bO = el('button','sg-btn','맞음'); bO.type='button';
          var bX = el('button','sg-btn','틀림'); bX.type='button';
          bO.addEventListener('click', function(){ item._self=true; card.classList.add('right'); card.classList.remove('wrong'); bO.classList.add('on'); bX.classList.remove('on'); updateScore(); });
          bX.addEventListener('click', function(){ item._self=false; card.classList.add('wrong'); card.classList.remove('right'); bX.classList.add('on'); bO.classList.remove('on'); updateScore(); });
          sg.appendChild(bO); sg.appendChild(bX); fb.appendChild(sg);
        }
        typeset(fb);
      });
      tally = { objTotal:objTotal, objRight:objRight, subjTotal:subjTotal };
      gradeBtn.hidden=true; retryBtn.hidden=false;
      resultBox.hidden=false; updateScore();
    }
    function updateScore(){
      if (!tally) return;
      var subjRight = current.filter(function(q){ return q.type==='주관식' && q._self===true; }).length;
      var subjGraded = current.filter(function(q){ return q.type==='주관식' && (q._self===true||q._self===false); }).length;
      var right = tally.objRight + subjRight, total = tally.objTotal + tally.subjTotal;
      var pct = total ? Math.round(right/total*100) : 0;
      resultBox.innerHTML='';
      resultBox.appendChild(el('div','score-main', '점수: ' + right + ' / ' + total + ' (' + pct + '%)'));
      resultBox.appendChild(el('div','score-sub', '객관식 ' + tally.objRight + '/' + tally.objTotal
        + ' · 주관식 자가채점 ' + subjRight + '/' + tally.subjTotal
        + (subjGraded < tally.subjTotal ? ' (미채점 ' + (tally.subjTotal - subjGraded) + ')' : '')));
    }
    gradeBtn.addEventListener('click', gradeQuiz);
  });
})();`;

/** 퀴즈 모달(문제풀이 UI). 비어 있어도 항상 렌더 — 문제 없으면 안내 표시. */
export function renderQuizModal() {
  return `<div id="quiz-modal" hidden role="dialog" aria-modal="true" aria-label="문제풀이">`
    + `<div class="quiz-box">`
    + `<button type="button" class="quiz-close" aria-label="닫기">✕</button>`
    + `<div id="quiz-config">`
    + `<h2>문제풀이</h2>`
    + `<p id="quiz-scope-info"></p>`
    + `<label class="quiz-field">문제 수 <input type="number" id="quiz-count" min="1" value="10"></label>`
    + `<label class="quiz-field"><input type="checkbox" id="quiz-scope-checked"> 체크한 강의만 출제</label>`
    + `<p class="quiz-hint">객관식·주관식이 무작위 순서로 출제됩니다. 주관식은 모범답안 보고 자가채점.</p>`
    + `<p id="quiz-empty" hidden>출제할 문제가 없습니다. 분석 JSON에 "문제" 필드를 추가하세요.</p>`
    + `<div class="quiz-actions"><button type="button" id="quiz-start">출제</button></div>`
    + `</div>`
    + `<div id="quiz-run" hidden>`
    + `<div id="quiz-progress"></div>`
    + `<form id="quiz-form"></form>`
    + `<div class="quiz-actions">`
    + `<button type="button" id="quiz-grade">채점하기</button>`
    + `<button type="button" id="quiz-retry" hidden>다시 출제</button>`
    + `</div>`
    + `<div id="quiz-result" hidden></div>`
    + `</div></div></div>`;
}

/** quizData를 <script type=application/json>에 안전하게 임베드. */
function embedQuizData(lectures) {
  const json = JSON.stringify(quizData(lectures))
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script type="application/json" id="quiz-data">${json}</script>`;
}

export function buildHtml({ course, lectures, css }) {
  const title = escapeHtml(course.course || '학습 가이드');
  const body = [
    `<header><h1>${title}</h1><p class="meta">생성: ${new Date().toISOString().slice(0, 10)}</p></header>`,
    renderToc(lectures),
    `<main>`,
    ...lectures.map(renderLectureSection),
    `</main>`,
    renderQuizModal(),
    embedQuizData(lectures),
  ].join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>`
    + `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">`
    + `<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>`
    + `<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>`
    + `<style>${css}</style></head><body>${body}`
    + `<script>${CLIENT_JS}</script></body></html>`;
}
