'use strict';
const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat('pt-BR');
const percent = new Intl.NumberFormat('pt-BR', {minimumFractionDigits:1,maximumFractionDigits:1});
const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const compact = new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1});
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const priceLabels = ['Preço não identificado','Categoria 1 · até Q20','Categoria 2 · Q20 a Q40','Categoria 3 · Q40 a Q60','Categoria 4 · Q60 a Q80','Categoria 5 · Q80 a Q95','Categoria 6 · acima de Q95'];
const priceColors = ['#a7b4ad','#2166ac','#67a9cf','#8fc2b7','#d0b779','#df8758','#b2182b'];
let map, polygons, data, meta, datasets, baseMeta, maxTotal, locked=null, highlighted=null, displayed=null;
const layers = new Map();
let coverageData, coverageMeta;
function fraction(n,total){return total>0 ? 100*n/total : 0;}
function nationalPercent(n){const p=fraction(n,meta.total_brasil);return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:p>0&&p<0.01?6:p<1?3:1}).format(p);}
function tooltip(id){const m=data[id];return `${escapeHtml(m.nome)} / ${escapeHtml(m.uf)}<br><b>${number.format(m.total)}</b> beneficiários`;}
function activateProfile(key){
  const current=locked||displayed;
  data=datasets[key];meta={...baseMeta,...baseMeta.perfis[key]};
  maxTotal=Math.max(1,...Object.values(data).map(m=>m.total));
  $('include-dental').checked=key==='todos';
  $('national-label').textContent=key==='todos'?'Histórico · todos os planos':'Brasil · vínculos médico-hospitalares';
  $('national-total').textContent=number.format(meta.total_brasil);
  $('reference').textContent=`Competência ${meta.competencia.split('-').reverse().join('/')} · vínculos ativos`;
  $('scope-note').textContent=key==='todos'?'Consulta histórica da versão anterior.':'Base atual do relatório · mensalidades estimadas em maio/2026 · inclui vínculos sem preço.';
  $('coverage').textContent=`${number.format(Object.keys(data).length)} municípios na malha · ${number.format(meta.sem_municipio_mapeavel)} vínculos sem município mapeável`;
  if(map){
    polygons.setStyle(style);
    layers.forEach((layer,id)=>layer.setTooltipContent(tooltip(id)));
    if(highlighted)emphasize(highlighted);
    displayed=null;if(current)displayMunicipality(current);
    updateLegend();setupMethod();
  }
}
function colorAt(t){
  const stops = [[33,102,172],[103,169,207],[247,247,247],[239,138,98],[178,24,43]];
  const x=Math.max(0,Math.min(1,t))*4,i=Math.min(3,Math.floor(x)),f=x-i;
  return '#'+stops[i].map((v,j)=>Math.round(v+(stops[i+1][j]-v)*f).toString(16).padStart(2,'0')).join('');
}
function ratio(n){return $('scale').value==='log' ? Math.log1p(n)/Math.log1p(maxTotal) : n/maxTotal;}
function style(feature){const total=data[String(feature.properties.codarea).slice(0,6)]?.total || 0;return {fillColor:total ? colorAt(ratio(total)):'#d9e0dd',weight:.35,color:'#fcfdfc',fillOpacity:.94};}
function updateLegend(){
  const log=$('scale').value==='log';
  $('legend-values').innerHTML=[0,.25,.5,.75,1].map(t=>`<span title="${number.format(log?Math.expm1(t*Math.log1p(maxTotal)):t*maxTotal)}">${compact.format(Math.round(log?Math.expm1(t*Math.log1p(maxTotal)):t*maxTotal))}</span>`).join('');
  $('legend-note').textContent=log?'Escala logarítmica: evidencia diferenças entre municípios.':'Escala linear: intervalos iguais representam quantidades iguais.';
}
function row(label,n,total,{color='',missing=false,showPercent=true,operator=false}={}){
  const p=fraction(n,total);
  return `<div class="bar-row${missing?' missing':''}${operator?' operator-row':''}"><div class="bar-label"><span>${escapeHtml(label)}</span><span class="bar-value">${number.format(n)}${showPercent?`<b>${percent.format(p)}%</b>`:''}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,p)}%;${color?`background:${color}`:''}"></div></div></div>`;
}
function chart(index,title,subtitle,rows){return `<section class="chart"><h3><span>${index}</span>${title}</h3><p class="chart-sub">${subtitle}</p>${rows}</section>`;}
function displayMunicipality(id){
  const m=data[id]; if(!m || displayed===id) return; displayed=id;
  $('municipality-name').textContent=m.nome;$('municipality-uf').textContent=m.uf;$('municipality-code').textContent=`Código IBGE ${m.codigo} · Referência ${meta.competencia.split('-').reverse().join('/')}`;
  let html=`<section class="total-card"><span>Total de beneficiários no município</span><strong>${number.format(m.total)}</strong><p><b>${nationalPercent(m.total)}%</b> dos beneficiários do Brasil</p></section>`;
  if(m.sem_classificacao_cobertura>0) html+=`<p class="classification-note">${number.format(m.sem_classificacao_cobertura)} vínculos com classificação de cobertura desconhecida, mantidos no total.</p>`;
  const priceOrder=[1,2,3,4,5,6,0];
  html+=chart('01','Categorias relativas de mensalidade','Quantis nacionais por idade · mensalidades atualizadas · % do município',priceOrder.map(i=>row(priceLabels[i],m.preco[i],m.total,{color:priceColors[i],missing:i===0})).join(''));
  const referenceLabels=['Mensalidade não atribuída','Faixa 1','Faixa 2','Faixa 3','Faixa 4','Faixa 5','Faixa 6','Preço sem faixa correspondente'];
  html+=chart('02','Faixas de preço da mensalidade','Mensalidade atualizada por idade e contratação · limite superior inclusivo · % do município',[1,2,3,4,5,6,0,7].map(i=>row(referenceLabels[i],m.faixas_preco[i],m.total,{color:priceColors[i]||'#a7b4ad',missing:i===0||i===7})).join(''));
  const identifiedPriceOrder=[1,2,3,4,5,6];
  const identifiedPriceTotal=identifiedPriceOrder.reduce((sum,i)=>sum+m.preco[i],0);
  html+=chart('03','Proporções das categorias de preço',`Base: ${number.format(identifiedPriceTotal)} beneficiários com preço identificado · % desse total`,identifiedPriceTotal>0?identifiedPriceOrder.map(i=>row(priceLabels[i],m.preco[i],identifiedPriceTotal,{color:priceColors[i]})).join(''):'<p class="empty">Nenhum beneficiário com preço identificado neste município e recorte.</p>');
  html+=chart('04','Faixas etárias','Idade aproximada · % do município',meta.faixas_etarias.map((label,i)=>row(label==='Nao identificada'?'Idade não identificada':label,m.idade[i],m.total,{missing:i===10})).join(''));
  const contracts=Object.entries(m.contratacao).sort((a,b)=>b[1]-a[1]);
  html+=chart('05','Tipos de contratação','Beneficiários · % do município',contracts.length?contracts.map(([label,n])=>row(label==='Nao identificado'?'Não identificado':label,n,m.total,{missing:label==='Nao identificado'})).join(''):'<p class="empty">Nenhum beneficiário registrado.</p>');
  const offers=Object.entries(m.oferta).sort((a,b)=>b[1]-a[1]),offerMax=Math.max(1,...offers.map(x=>x[1]));
  html+=chart('06','Planos ofertados','Produtos ativos ofertados no município · sem filtro de compatibilidade por vínculo',offers.length?offers.map(([label,n])=>row(label,n,offerMax,{showPercent:false,color:'#789b86'})).join(''):'<p class="empty">Nenhum plano ativo identificado na base de comercialização.</p>');
  const covered=Object.entries(coverageData[$('include-dental').checked?'todos':'sem_odonto'][id]||{}).sort((a,b)=>b[1]-a[1]),coveredMax=Math.max(1,...covered.map(x=>x[1]));
  html+=chart('07','Planos com cobertura na área','Planos ativos na área de cobertura · por contratação',covered.length?covered.map(([label,n])=>row(label,n,coveredMax,{showPercent:false,color:'#6b8faf'})).join(''):'<p class="empty">Nenhum plano ativo identificado com cobertura neste município.</p>');
  html+=chart('08','As 6 maiores operadoras','Beneficiários por registro de operadora · % do município',m.operadoras.length?m.operadoras.map(op=>row(op.nome,op.quantidade,m.total,{operator:true})).join(''):'<p class="empty">Nenhum beneficiário registrado.</p>');
  $('panel-content').innerHTML=html;
}
function emphasize(layer){
  if(highlighted && highlighted!==layer) polygons.resetStyle(highlighted);
  highlighted=layer;
  if(layer) {layer.setStyle({weight:1.6,color:'#173c36',fillOpacity:1});layer.bringToFront();}
}
function select(id,{lock=false,zoom=false}={}){
  if(lock){locked=id;$('unlock').hidden=false;$('selection-state').textContent='MUNICÍPIO FIXADO';}
  else $('selection-state').textContent='EXPLORANDO MUNICÍPIO';
  emphasize(layers.get(id));displayMunicipality(id);
  if(zoom && layers.has(id)) map.fitBounds(layers.get(id).getBounds(),{padding:[45,45],maxZoom:10});
}
function unlock(){locked=null;$('unlock').hidden=true;$('selection-state').textContent='PASSE O MOUSE PARA EXPLORAR';emphasize(null);}
function search(){
  const query=$('search').value.trim(),normalized=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const entry=Object.entries(data).find(([id,m])=>query===m.codigo||query===id||normalized===`${m.nome} / ${m.uf}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()) || Object.entries(data).find(([,m])=>normalized===m.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
  if(entry){$('search').setCustomValidity('');select(entry[0],{lock:true,zoom:true});}
  else {$('search').setCustomValidity('Escolha um município da lista ou informe seu código IBGE.');$('search').reportValidity();}
}
function setupMethod(){
  const quantiles=meta.quantis.map(q=>`<tr><td>${escapeHtml(q.faixa_etaria)}</td>${['q20','q40','q60','q80','q95'].map(k=>`<td>${money.format(q[k])}</td>`).join('')}<td>${number.format(q.quantidade_precos)}</td></tr>`).join('');
  const ranges=meta.faixas_preco_referencia.map(f=>`<tr><td>${escapeHtml(f.contratacao)}</td><td>${escapeHtml(f.faixa_etaria)}</td><td>${f.faixa_num}</td><td>${money.format(f.limite_inferior_exclusivo)}</td><td>${money.format(f.limite_superior_inclusivo)}</td></tr>`).join('');
  $('method-content').innerHTML=`<h3>População e referências</h3><p>O atlas usa os mesmos arquivos nacionais do relatório: <b>${number.format(meta.total_brasil)} vínculos médico-hospitalares</b>, competência maio/2026, cadastro e oferta atualizados em 09/10/2026. Vínculo é uma inscrição em plano, não pessoa única. Os registros sem mensalidade são mantidos no total, nas idades, contratações e operadoras; não recebem preço zero.</p><p>A base atual contém ${number.format(meta.auditoria_precificacao.linhas_quantis)} mensalidades atribuídas. São estimativas por metodologia RPC/ANS, referência maio/2026, incluindo notas históricas. Os ${number.format(meta.auditoria_precificacao.historico_parcial)} casos precificados com histórico parcial permanecem identificados na fonte. A mensalidade não é necessariamente o pagamento observado. Produtos exclusivamente odontológicos e vínculos sem classificação médico-hospitalar não integram este conjunto.</p><h3>Denominadores</h3><p>As distribuições municipais dividem os vínculos de cada grupo pelo total do município. O gráfico 03 usa somente vínculos com mensalidade atribuída. A participação municipal no Brasil usa o total nacional, incluindo ${number.format(meta.sem_municipio_mapeavel)} vínculos sem correspondência com a malha. As seis maiores operadoras podem somar menos de 100%.</p><h3>Categorias relativas de mensalidade</h3><p>Os quantis Q20, Q40, Q60, Q80 e Q95 são calculados nacionalmente dentro de cada idade, dando o mesmo peso a cada vínculo precificado. Um preço repetido em mais vínculos pesa mais. A interpolação é linear; limites superiores são inclusivos e empates podem alterar a proporção em cada categoria. Essas categorias relativas não são as faixas regulatórias da IN nº 56.</p><div class="table-wrap"><table><thead><tr><th>Idade</th><th>Q20</th><th>Q40</th><th>Q60</th><th>Q80</th><th>Q95</th><th>Vínculos</th></tr></thead><tbody>${quantiles}</tbody></table></div><h3>Faixas de preço da mensalidade e compatibilidade</h3><p>Os 180 intervalos vigentes de <b>faixas_preco_vigentes.xlsx</b> foram conferidos com rel_faixa_de_preco.csv. O gráfico 02 classifica a mensalidade atualizada pela idade e contratação do plano de origem: preço maior que o limite inferior e menor ou igual ao superior. Um preço exatamente no corte permanece na categoria que termina nesse valor.</p><p>No relatório, o encontro entre origem e destino segue o <b>artigo 3º, §§1º, 2º e 3º, da IN nº 56</b>: primeiro classificar a mensalidade na idade e contratação do vínculo (§1º); se a coluna de situação da origem indicar <b>Ativo</b> e houver nota válida, classificar também o preço de 44–48 anos da NTRP (§2º); escolher a maior das duas categorias (§3º). Origem inativa não recebe elevação, mesmo que tenha nota histórica. O teto em reais é o limite superior da classificação que prevalece.</p><p>O destino recebe uma categoria fixa pela NTRP de 44–48 anos e pela contratação do próprio produto. São opções os produtos ofertados no município em categorias <b>iguais ou inferiores</b> ao teto do vínculo: categoria 4 permite categorias 1, 2, 3 e 4. Comparam-se categorias; o limite inferior não exclui destinos mais baratos. A distribuição municipal de mensalidades não representa essa maior categoria de acesso.</p><details><summary>Consultar limites vigentes em reais</summary><div class="table-wrap"><table><thead><tr><th>Contratação</th><th>Idade</th><th>Faixa</th><th>Acima de</th><th>Até, inclusive</th></tr></thead><tbody>${ranges}</tbody></table></div></details><h3>Planos ofertados e cobertura</h3><p>O gráfico 06 conta produtos ativos distintos em comercializacao.parquet, por município e contratação, incluindo aqueles sem preço classificável. É a oferta municipal do catálogo, antes de avaliar a compatibilidade de cada vínculo. A quantidade de opções individuais/familiares por vínculo é analisada no relatório.</p><p>O gráfico 07 usa cobertura.parquet: produtos ativos distintos com área de cobertura no município. Cobertura e comercialização são dimensões diferentes. As barras desses dois quadros usam a maior contagem entre contratações como referência de largura; não são percentuais de vínculos.</p><h3>Idade, operadoras e território</h3><p>A idade é aproximada pela referência de 2026, conforme a coluna idade_referencia das origens. A contratação e o registro de operadora vêm das mesmas linhas de origem do relatório. A malha simplificada do IBGE é de ${meta.malha_periodo}; códigos de seis dígitos são associados aos sete dígitos da malha. Azul indica menor quantidade e vermelho maior quantidade. Municípios sem vínculos aparecem em cinza. Processamento: ${escapeHtml(meta.gerado_em)}.</p>`;
}
async function init(){
  try {
    const load=async file=>{const response=await fetch(`data/${file}`);if(!response.ok)throw new Error(`Falha ao carregar ${file} (${response.status})`);return response.json();};
    const [loadedData,loadedMeta,geo,loadedCoverage]=await Promise.all([load('indicadores.json'),load('metadados.json'),load('municipios.geojson'),load('cobertura.json')]);
    coverageData=loadedCoverage.perfis;coverageMeta=loadedCoverage.metadados;datasets=loadedData;baseMeta=loadedMeta;activateProfile(baseMeta.perfil_padrao);
    map=L.map('map',{preferCanvas:true,minZoom:3,maxZoom:13,zoomSnap:.25,scrollWheelZoom:true});
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    polygons=L.geoJSON(geo,{style,onEachFeature:(feature,layer)=>{
      const id=String(feature.properties.codarea).slice(0,6),m=data[id];if(!m)return;layers.set(id,layer);
      layer.bindTooltip(tooltip(id),{sticky:true});
      layer.on({mouseover:()=>{if(!locked)select(id);},mouseout:()=>{if(!locked && highlighted===layer)emphasize(null);},click:()=>select(id,{lock:true})});
    },attribution:'Malha municipal © IBGE, 2022'}).addTo(map);
    map.fitBounds(polygons.getBounds(),{padding:[10,10]});
    $('municipality-list').innerHTML=Object.values(data).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(m=>`<option value="${escapeHtml(m.nome+' / '+m.uf)}"></option>`).join('');
    const largest=Object.keys(data).reduce((a,b)=>data[a].total>data[b].total?a:b);displayMunicipality(largest);
    updateLegend();setupMethod();$('loading').hidden=true;
    $('include-dental').disabled=!datasets.todos;
    $('include-dental').addEventListener('change',()=>activateProfile($('include-dental').checked?'todos':'sem_odonto'));
    $('scale').addEventListener('change',()=>{polygons.setStyle(style);if(highlighted)emphasize(highlighted);updateLegend();});
    $('unlock').addEventListener('click',unlock);$('search-go').addEventListener('click',search);
    $('search').addEventListener('keydown',e=>{if(e.key==='Enter')search();});$('search').addEventListener('input',()=>{$('search').setCustomValidity('');});
    $('reset').addEventListener('click',()=>{unlock();$('search').value='';map.fitBounds(polygons.getBounds(),{padding:[10,10]});});
    $('method-button').addEventListener('click',()=>$('method-dialog').showModal());$('close-method').addEventListener('click',()=>$('method-dialog').close());
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('method-dialog').open)unlock();});
  } catch(error){$('loading').classList.add('error');$('loading').textContent=`Não foi possível carregar o mapa. ${error.message}. Abra a aplicação por um servidor HTTP ou pelo GitHub Pages.`;console.error(error);}
}
init();
