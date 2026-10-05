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
function fraction(n,total){return total>0 ? 100*n/total : 0;}
function nationalPercent(n){const p=fraction(n,meta.total_brasil);return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:p>0&&p<0.01?6:p<1?3:1}).format(p);}
function tooltip(id){const m=data[id];return `${escapeHtml(m.nome)} / ${escapeHtml(m.uf)}<br><b>${number.format(m.total)}</b> beneficiários`;}
function activateProfile(key){
  const current=locked||displayed;
  data=datasets[key];meta={...baseMeta,...baseMeta.perfis[key]};
  maxTotal=Math.max(1,...Object.values(data).map(m=>m.total));
  $('include-dental').checked=key==='todos';
  $('national-label').textContent=key==='todos'?'Beneficiários no Brasil · todos os planos':'Brasil · sem exclusivamente odontológicos';
  $('national-total').textContent=number.format(meta.total_brasil);
  $('reference').textContent=`Competência ${meta.competencia.split('-').reverse().join('/')} · vínculos ativos`;
  $('scope-note').textContent=(key==='todos'?'Todos os planos incluídos.':`${number.format(meta.exclusivamente_odontologicos)} vínculos exclusivamente odontológicos excluídos.`)+` ${number.format(meta.sem_classificacao_cobertura)} sem classificação de cobertura mantidos.`;
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
  html+=chart('01','Categorias de preço','Posição do preço dentro de cada faixa etária · % do município',priceOrder.map(i=>row(priceLabels[i],m.preco[i],m.total,{color:priceColors[i],missing:i===0})).join(''));
  const referenceLabels=['Preço não identificado','Faixa 1','Faixa 2','Faixa 3','Faixa 4','Faixa 5','Faixa 6','Preço sem faixa correspondente'];
  html+=chart('02','Faixas de preço vigentes','Limites vigentes por idade e contratação · % do município',[1,2,3,4,5,6,0,7].map(i=>row(referenceLabels[i],m.faixas_preco[i],m.total,{color:priceColors[i]||'#a7b4ad',missing:i===0||i===7})).join(''));
  const identifiedPriceOrder=[1,2,3,4,5,6];
  const identifiedPriceTotal=identifiedPriceOrder.reduce((sum,i)=>sum+m.preco[i],0);
  html+=chart('03','Proporções das categorias de preço',`Base: ${number.format(identifiedPriceTotal)} beneficiários com preço identificado · % desse total`,identifiedPriceTotal>0?identifiedPriceOrder.map(i=>row(priceLabels[i],m.preco[i],identifiedPriceTotal,{color:priceColors[i]})).join(''):'<p class="empty">Nenhum beneficiário com preço identificado neste município e recorte.</p>');
  html+=chart('04','Faixas etárias','Idade aproximada · % do município',meta.faixas_etarias.map((label,i)=>row(label==='Nao identificada'?'Idade não identificada':label,m.idade[i],m.total,{missing:i===10})).join(''));
  const contracts=Object.entries(m.contratacao).sort((a,b)=>b[1]-a[1]);
  html+=chart('05','Tipos de contratação','Beneficiários · % do município',contracts.length?contracts.map(([label,n])=>row(label==='Nao identificado'?'Não identificado':label,n,m.total,{missing:label==='Nao identificado'})).join(''):'<p class="empty">Nenhum beneficiário registrado.</p>');
  const offers=Object.entries(m.oferta).sort((a,b)=>b[1]-a[1]),offerMax=Math.max(1,...offers.map(x=>x[1]));
  html+=chart('06','Planos ofertados','Planos distintos ativos na área de comercialização · por contratação',offers.length?offers.map(([label,n])=>row(label,n,offerMax,{showPercent:false,color:'#789b86'})).join(''):'<p class="empty">Nenhum plano ativo identificado na base de comercialização.</p>');
  html+=chart('07','As 6 maiores operadoras','Beneficiários por registro de operadora · % do município',m.operadoras.length?m.operadoras.map(op=>row(op.nome,op.quantidade,m.total,{operator:true})).join(''):'<p class="empty">Nenhum beneficiário registrado.</p>');
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
  const ranges=meta.faixas_preco_referencia.map(f=>`<tr><td>${escapeHtml(f.contratacao)}</td><td>${escapeHtml(f.faixa_etaria)}</td><td>${f.faixa_num}</td><td>${money.format(f.limite_inferior_exclusivo)}</td><td>${money.format(f.limite_superior_inclusivo)}</td><td>${escapeHtml(f.inicio_validade)}</td></tr>`).join('');
  $('method-content').innerHTML=`<h3>Beneficiários e denominadores</h3><p>Recorte selecionado da base de vínculos ativos do projeto, competência <b>${escapeHtml(meta.competencia)}</b>: <b>${number.format(meta.total_brasil)}</b> vínculos. Não há filtro de tempo de contratação. A participação municipal usa o total nacional, incluindo <b>${number.format(meta.sem_municipio_mapeavel)}</b> vínculos sem município compatível com a malha. Os gráficos de categorias no total e de faixas vigentes, as distribuições de idade e contratação e as participações das operadoras usam o total do próprio município. O gráfico de proporções das categorias de preço usa somente a soma dos beneficiários nas seis categorias de preço identificado: cada categoria dividida por essa soma. Preços não identificados não entram nesse denominador de preços identificados. Quando não há preço identificado, o gráfico informa a ausência de dados. As seis operadoras exibidas não precisam somar 100%.</p><p>Os registros representam vínculos com planos, e não pessoas únicas. A idade é aproximada: ano da competência menos ano de nascimento. As categorias desconhecidas permanecem nos totais.</p><h3>Filtro de cobertura</h3><p>A visualização padrão exclui somente planos com <b>GR_SGMT_ASSISTENCIAL = Exclusivamente Odontológico</b>. Planos médicos com cobertura odontológica permanecem. Marque <b>Incluir planos exclusivamente odontológicos</b> para mostrar todos os planos: ${number.format(meta.perfis.todos.total_brasil)} vínculos nacionais. O filtro atualiza os denominadores, as cores, todas as distribuições, a oferta e o ranking de operadoras.</p><p>Há <b>${number.format(meta.sem_classificacao_cobertura)}</b> vínculos nacionais sem classificação de cobertura. Eles permanecem em ambos os recortes e são indicados no painel municipal. Os cortes de preço são os mesmos nas duas visões, pois a fonte de preços já não contém planos exclusivamente odontológicos.</p><h3>Preço relativo à faixa etária</h3><p>Referência: <b>VL_COMERCIAL_MENSALIDADE</b>, na base nacional de produtos e preços do projeto (notas de 2025 e 2026). Cada combinação de produto e faixa etária contribui uma vez, sem ponderação pelo número de beneficiários ou pelos municípios. Quantis com interpolação linear. A categoria 1 inclui preços até Q20; as seguintes incluem o limite superior e excluem o inferior; a categoria 6 contém preços acima de Q95. Empates podem resultar em categorias vazias.</p><p>A categoria tem o mesmo significado relativo em todas as idades, mas limites diferentes em reais. Não representa necessariamente o preço efetivamente pago. Há <b>${number.format(meta.sem_preco)}</b> beneficiários no recorte selecionado sem preço classificável por operadora, plano e idade.</p><div class="table-wrap"><table><thead><tr><th>Faixa etária</th><th>Q20</th><th>Q40</th><th>Q60</th><th>Q80</th><th>Q95</th><th>Preços</th></tr></thead><tbody>${quantiles}</tbody></table></div><h3>Faixas de preço vigentes</h3><p>Fonte: <b>faixa_preco_vigor.csv</b>. São usadas somente linhas com <b>DT_FIM_VALIDADE vazia ou NA</b>; faixas encerradas são excluídas. A mensalidade comercial é comparada aos limites da combinação de idade e tipo de contratação. O limite inferior é exclusivo e o superior inclusivo: uma mensalidade exatamente no corte fica na faixa que termina nesse valor.</p><p>A numeração de faixas é agregada entre idades e contratações, mas os valores em reais variam entre essas combinações. Preços não identificados e preços conhecidos sem faixa correspondente aparecem separadamente. Os limites vigentes do arquivo são aplicados à base de beneficiários da competência informada, mesmo quando a vigência da tabela é posterior.</p><details><summary>Consultar limites vigentes em reais</summary><div class="table-wrap"><table><thead><tr><th>Contratação</th><th>Idade</th><th>Faixa</th><th>Acima de</th><th>Até</th><th>Início da vigência</th></tr></thead><tbody>${ranges}</tbody></table></div></details><h3>Contratação, operadoras e oferta</h3><p>Os beneficiários se vinculam ao cadastro pela operadora e pelo registro RPS do plano. Em duplicatas cadastrais, prioriza-se o registro ativo, a atualização mais recente e o ID do produto. A operadora é agrupada por registro ANS.</p><p>A oferta é a contagem distinta de planos na base municipal de comercialização NTRP, vinculada ao ID do produto no cadastro com situação <b>Ativo</b>. Oferta comercial e município de residência dos beneficiários são dimensões diferentes. A largura das barras de oferta é relativa ao maior número de planos entre os tipos de contratação do município.</p><h3>Território e cores</h3><p>Malha municipal simplificada do <a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3" target="_blank" rel="noopener">IBGE</a>, período ${meta.malha_periodo}. Os códigos de seis dígitos das bases são associados aos sete dígitos da malha. Azul indica menor quantidade e vermelho maior quantidade. Municípios sem beneficiários na base aparecem em cinza. A escala logarítmica é o padrão; a escala linear pode ser selecionada na legenda.</p><p class="method-note">Cadastros de produtos e comercialização têm referências de atualização distintas da competência dos beneficiários. Processamento: ${escapeHtml(meta.gerado_em)}.</p>`;
}
async function init(){
  try {
    const load=async file=>{const response=await fetch(`data/${file}`);if(!response.ok)throw new Error(`Falha ao carregar ${file} (${response.status})`);return response.json();};
    const [loadedData,loadedMeta,geo]=await Promise.all([load('indicadores.json'),load('metadados.json'),load('municipios.geojson')]);
    datasets=loadedData;baseMeta=loadedMeta;activateProfile(baseMeta.perfil_padrao);
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
    $('include-dental').disabled=false;
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
