const state={completed:new Set(JSON.parse(localStorage.getItem('dataLabProgress')||'[]'))};
const tabs=[...document.querySelectorAll('[role="tab"]')];
const panels=[...document.querySelectorAll('[role="tabpanel"]')];
const toast=document.querySelector('#toast');

function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),1800)}
function openTab(name){tabs.forEach(tab=>{const active=tab.dataset.tab===name;tab.setAttribute('aria-selected',active);tab.tabIndex=active?0:-1});panels.forEach(panel=>{const active=panel.id===`panel-${name}`;panel.hidden=!active;panel.classList.toggle('active',active)})}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>openTab(tab.dataset.tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;const step=event.key==='ArrowRight'?1:-1;const next=tabs[(index+step+tabs.length)%tabs.length];next.focus();openTab(next.dataset.tab)})});
document.querySelectorAll('[data-open-tab]').forEach(link=>link.addEventListener('click',()=>openTab(link.dataset.openTab)));

const ages=[22,38,null,35,28];
function renderMissing(method='mean'){
  const valid=ages.filter(Number.isFinite);const mean=valid.reduce((a,b)=>a+b,0)/valid.length;const sorted=[...valid].sort((a,b)=>a-b);const median=(sorted[1]+sorted[2])/2;
  let replacement=method==='mean'?mean:median;
  document.querySelector('#missingTable').innerHTML=ages.map((age,index)=>{if(age!==null)return `<tr><td>${index+1}</td><td>${age}</td><td>유지</td></tr>`;if(method==='drop')return `<tr><td>${index+1}</td><td>NaN</td><td class="removed">행 삭제</td></tr>`;return `<tr><td>${index+1}</td><td>NaN</td><td class="changed">${replacement.toFixed(1)}로 대체</td></tr>`}).join('');
  const messages={mean:`평균 30.8로 채웁니다. 모든 값을 반영하지만 큰 이상치가 있으면 평균이 흔들릴 수 있어요.`,median:`중앙값 31.5로 채웁니다. 극단적으로 크거나 작은 값의 영향을 평균보다 적게 받아요.`,drop:`결측치가 있는 행을 제거합니다. 간단하지만 사용할 수 있는 데이터가 줄어들어요.`};
  document.querySelector('#missingResult').textContent=messages[method];
  const code={mean:"titanic['Age'].fillna(titanic['Age'].mean())",median:"titanic['Age'].fillna(titanic['Age'].median())",drop:"titanic.dropna(subset=['Age'])"}[method];document.querySelector('#missingCode').textContent=`# Age 열의 결측치 확인하기\ntitanic['Age'].isna().sum()\n\n# 선택한 방법 적용하기\n${code}`;
}
document.querySelectorAll('[data-fill]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-fill]').forEach(item=>item.classList.toggle('active',item===button));renderMissing(button.dataset.fill)}));renderMissing();

const fares=[7,10,18,30,45,60,85,120];
const fareOptions=document.querySelector('#fareOptions');fareOptions.innerHTML=fares.map(value=>`<button type="button" data-value="${value}" aria-pressed="false">${value}</button>`).join('');
fareOptions.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;button.classList.toggle('selected');button.setAttribute('aria-pressed',button.classList.contains('selected'))});
document.querySelector('#checkOutliers').addEventListener('click',()=>{const selected=[...fareOptions.querySelectorAll('.selected')].map(button=>Number(button.dataset.value));const correct=selected.length===2&&selected.includes(85)&&selected.includes(120);const feedback=document.querySelector('#outlierFeedback');feedback.className=`feedback ${correct?'success':'error'}`;feedback.textContent=correct?'정답입니다. 60보다 큰 85와 120이 상한을 벗어납니다.':'다시 확인해 보세요. 정상 범위의 상한 60보다 큰 값을 모두 골라야 합니다.';if(correct){const button=document.querySelector('[data-complete="outlier"]');button.disabled=false;button.textContent='미션 2 완료하기'}});

const labels=['Sepal L.','Sepal W.','Petal L.','Petal W.','Species'];
const matrix=[[1,-.11,.87,.82,.78],[-.11,1,-.42,-.36,-.42],[.87,-.42,1,.96,.95],[.82,-.36,.96,1,.96],[.78,-.42,.95,.96,1]];
const heatmap=document.querySelector('#heatmap');let heatHtml='<span></span>'+labels.map(label=>`<span class="heat-label">${label}</span>`).join('');matrix.forEach((row,i)=>{heatHtml+=`<span class="heat-label">${labels[i]}</span>`;row.forEach(value=>{const hue=value<0?'210,55%':value>.8?'45,88%':'205,70%';const light=value<0?`${62+value*35}%`:`${30+value*28}%`;heatHtml+=`<span class="heat-cell" style="background:hsl(${hue},${light})">${value.toFixed(2)}</span>`})});heatmap.innerHTML=heatHtml;
const features=[['SepalLengthCm','꽃받침 길이 · r=0.78'],['SepalWidthCm','꽃받침 너비 · r=-0.42'],['PetalLengthCm','꽃잎 길이 · r=0.95'],['PetalWidthCm','꽃잎 너비 · r=0.96']];
const featureOptions=document.querySelector('#featureOptions');featureOptions.innerHTML=features.map(([key,label])=>`<button type="button" data-feature="${key}" aria-pressed="false">${label}</button>`).join('');featureOptions.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;button.classList.toggle('selected');button.setAttribute('aria-pressed',button.classList.contains('selected'))});
document.querySelector('#checkFeatures').addEventListener('click',()=>{const selected=[...featureOptions.querySelectorAll('.selected')].map(button=>button.dataset.feature);const correct=selected.length===2&&selected.includes('PetalLengthCm')&&selected.includes('PetalWidthCm');const feedback=document.querySelector('#featureFeedback');feedback.className=`feedback ${correct?'success':'error'}`;feedback.textContent=correct?'정답입니다. 꽃잎 길이(0.95)와 꽃잎 너비(0.96)가 Species와 가장 강한 상관관계를 보입니다.':'상관계수의 절댓값이 1에 가장 가까운 속성 두 개를 다시 찾아보세요.';if(correct){const button=document.querySelector('[data-complete="feature"]');button.disabled=false;button.textContent='미션 3 완료하기'}});

function updateProgress(){const percent=Math.round(state.completed.size/3*100);document.querySelector('#progressText').textContent=`${percent}% 완료`;document.querySelector('#progressBar').style.width=`${percent}%`;document.querySelectorAll('[data-complete]').forEach(button=>{if(state.completed.has(button.dataset.complete)){button.disabled=false;button.textContent='완료됨 ✓';button.classList.add('done')}})}
document.querySelectorAll('[data-complete]').forEach(button=>button.addEventListener('click',()=>{if(button.disabled)return;state.completed.add(button.dataset.complete);localStorage.setItem('dataLabProgress',JSON.stringify([...state.completed]));updateProgress();showToast('학습 진행 상황을 저장했습니다.')}));
document.querySelector('#resetProgress').addEventListener('click',()=>{state.completed.clear();localStorage.removeItem('dataLabProgress');document.querySelectorAll('[data-complete]').forEach((button,index)=>{button.classList.remove('done');button.textContent=`미션 ${index+1} 완료하기`;if(index>0)button.disabled=true});updateProgress();showToast('진행 기록을 초기화했습니다.')});
document.querySelectorAll('.copy-button').forEach(button=>button.addEventListener('click',async()=>{const text=document.querySelector(`#${button.dataset.copy}`).textContent;try{await navigator.clipboard.writeText(text);showToast('코드를 복사했습니다.')}catch{showToast('복사하지 못했습니다. 코드를 직접 선택해 주세요.')}}));
updateProgress();
