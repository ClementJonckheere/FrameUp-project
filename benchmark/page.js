const el=id=>document.getElementById(id);
let report,worker,timer,visibilityCleanup=()=>{};
function end(){visibilityCleanup();clearInterval(timer);worker?.terminate();worker=null;el('run').disabled=false;el('cancel').disabled=true;}
el('form').onsubmit=async event=>{
  event.preventDefault();el('run').disabled=true;el('download').disabled=true;el('cancel').disabled=false;el('result').textContent='';
  let maxLag=0,last=performance.now(),hidden=document.visibilityState!=='visible';
  const visibility=()=>{if(document.visibilityState!=='visible')hidden=true;};document.addEventListener('visibilitychange',visibility);visibilityCleanup=()=>document.removeEventListener('visibilitychange',visibility);
  let provenance;try{const response=await fetch('/benchmark-build.json');if(!response.ok)throw Error('BUILD_METADATA_UNAVAILABLE');provenance=await response.json();}catch(e){el('status').textContent=String(e);end();return;}
  const metadata={hardware:el('hardware').value,system:el('system').value,conditions:el('conditions').value,declaredSlowestPhysicalTarget:el('target').checked,observedProcessPeakMiB:el('memory').value?Number(el('memory').value):null,userAgent:navigator.userAgent,logicalCores:navigator.hardwareConcurrency,deviceMemoryHintGiB:navigator.deviceMemory??null,provenance};
  timer=setInterval(()=>{const now=performance.now();maxLag=Math.max(maxLag,now-last-50);last=now;},50);
  worker=new Worker('/benchmark-worker.js',{type:'module'});
  worker.onerror=e=>{el('status').textContent='Erreur worker : '+e.message;document.removeEventListener('visibilitychange',visibility);end();};
  worker.onmessage=({data})=>{
    if(data.progress)el('status').textContent=data.progress;
    if(data.report){
      report={...data.report,metadata,ui:{maxTimerDelayMs:maxLag,hiddenDuringRun:hidden},gateDecision:'PENDING_TARGET_REVIEW'};
      document.removeEventListener('visibilitychange',visibility);end();el('status').textContent=report.status==='COMPLETE'?'Mesure terminée. Exporter le JSON pour arbitrage.':'Mesure échouée : '+report.error;
      el('result').textContent=JSON.stringify(report,null,2);el('download').disabled=false;
    }
  };
  worker.postMessage({});
};
el('cancel').onclick=()=>{end();el('status').textContent='Mesure annulée ; aucun résultat complet. Les bases fictives restantes portent le préfixe frameup-benchmark ou frameup-j0:benchmark.';};
el('download').onclick=()=>{report.metadata.observedProcessPeakMiB=el('memory').value?Number(el('memory').value):null;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='frameup-coffre-mesure.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
