const switchMasks={A:[0,1,3],B:[0,1,2],C:[1,2,3],D:[0,2,3]};
const modes={main:{initial:[0,0,0,0],copy:'초기 상태 0000에서 목표 상태 1111까지 탐색하세요.'},practice:{initial:[0,1,1,1],copy:'1번만 꺼진 0111에서 목표 상태 1111까지 탐색하세요.'}};
let mode='main',state=[],history=[],attempts=0;
const bulbRow=document.querySelector('#bulbRow'),trace=document.querySelector('#trace'),success=document.querySelector('#successPanel');

function bits(values){return values.join('')}
function initialForMode(){return [...modes[mode].initial]}
function toggle(values,key){const next=[...values];switchMasks[key].forEach(index=>next[index]=next[index]?0:1);return next}
function isGoal(values){return values.every(Boolean)}
function renderBulbs(){bulbRow.innerHTML=state.map((on,index)=>`<div class="bulb ${on?'on':''}"><div class="bulb-face" aria-hidden="true"></div><label>${index+1}번 · ${on?'켜짐':'꺼짐'}</label></div>`).join('');document.querySelector('#binaryState').textContent=bits(state)}
function renderTrace(){const visited=new Set();let html=`<div class="trace-node ${history.length?'':'current'}"><b>${bits(initialForMode())}</b><small>초기 상태</small></div>`;let current=initialForMode();history.forEach((step,index)=>{current=toggle(current,step);const value=bits(current),repeated=visited.has(value)||value===bits(initialForMode());visited.add(value);html+=`<div class="trace-link">${step} →</div><div class="trace-node ${index===history.length-1?'current':''} ${repeated?'repeated':''}"><b>${value}</b><small>${repeated?'재방문':'상태 '+(index+1)}</small></div>`});trace.innerHTML=html}
function render(){renderBulbs();renderTrace();document.querySelector('#moveCount').textContent=history.length;document.querySelector('#undoButton').disabled=!history.length}
function reset(){state=initialForMode();history=[];success.hidden=true;render()}
function press(key){if(!success.hidden)return;state=toggle(state,key);history.push(key);render();if(isGoal(state)){success.hidden=false;document.querySelector('#successCopy').textContent=`${history.length}번 만에 성공했습니다. 탐색 경로: ${history.join(' → ')}`}}
document.querySelector('#switchRow').addEventListener('click',event=>{const button=event.target.closest('[data-switch]');if(button)press(button.dataset.switch)});
document.querySelector('#undoButton').addEventListener('click',()=>{if(!history.length)return;history.pop();state=initialForMode();history.forEach(key=>state=toggle(state,key));success.hidden=true;render()});
document.querySelector('#resetButton').addEventListener('click',()=>{attempts++;reset();if(attempts>=2){document.querySelector('#hintButton').disabled=false;document.querySelector('#hintText').textContent='힌트를 열어 탐색 방향을 확인할 수 있습니다.'}});
document.querySelector('#resetAll').addEventListener('click',()=>{mode='main';attempts=0;document.querySelectorAll('[data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode==='main'));document.querySelector('#hintButton').disabled=true;document.querySelector('#hintText').textContent='힌트는 2번 실패한 뒤 열립니다.';updateMode();location.hash='lab'});
document.querySelector('#replayButton').addEventListener('click',reset);
document.querySelector('#hintButton').addEventListener('click',()=>{document.querySelector('#hintText').textContent=mode==='main'?'각 스위치를 한 번씩 눌러 보세요. 순서는 결과에 영향을 주지 않습니다.':'목표 상태와 현재 상태에서 서로 다른 전구는 1번 하나입니다. 여러 스위치의 반전을 조합해 보세요.'});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;attempts=0;document.querySelectorAll('[data-mode]').forEach(item=>item.classList.toggle('active',item===button));document.querySelector('#hintButton').disabled=true;document.querySelector('#hintText').textContent='힌트는 2번 실패한 뒤 열립니다.';updateMode()}));
function updateMode(){document.querySelector('#missionTitle').textContent=mode==='main'?'모든 전구 켜기':'1번 전구까지 켜기';document.querySelector('#missionCopy').textContent=modes[mode].copy;document.querySelector('#initialState').textContent=bits(initialForMode());reset()}
updateMode();
