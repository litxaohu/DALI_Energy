document.addEventListener('DOMContentLoaded',function(){
  var powerChartDom=document.getElementById('energy-power-chart');
  var consChartDom=document.getElementById('energy-consumption-chart');
  var hasUI=document.getElementById('energy-distribution');
  var priceChartDom=document.getElementById('price-chart');
  var feeChartDom=document.getElementById('fee-chart');
  function fmt(n,unit){return (Math.round(n*100)/100)+' '+unit}
  function renderSourcesTable(data){
    var box=document.getElementById('energy-sources-table'); if(!box) return;
    var table=document.createElement('table');
    var thead=document.createElement('thead');
    var isEN = location.pathname.indexOf('/en/')===0;
    
    if(isEN){
      thead.innerHTML='<tr><th>Source</th><th>Usage</th><th>Cost</th></tr>';
    } else {
      thead.innerHTML='<tr><th>数据源</th><th>用量</th><th>费用</th></tr>';
    }
    
    var tbody=document.createElement('tbody');
    var rows=[];
    if(isEN){
      rows=[
        {name:'PV Yield', val:fmt(data.solar_kwh,'kWh'), cost:'—'},
        {name:'Battery Net', val:fmt(data.battery_net_kwh,'kWh'), cost:'—'},
        {name:'Grid Import', val:fmt(data.grid_in_kwh,'kWh'), cost:'US$'+(data.grid_cost_usd||0).toFixed(2)},
        {name:'Gas Total', val:fmt(data.gas_m3,'m³'), cost:'US$'+(data.gas_cost_usd||0).toFixed(2)},
        {name:'Water Total', val:fmt(data.water_l,'L'), cost:'US$'+(data.water_cost_usd||0).toFixed(2)}
      ];
    } else {
      rows=[
        {name:'光伏发电总量', val:fmt(data.solar_kwh,'kWh'), cost:'—'},
        {name:'电池合计', val:fmt(data.battery_net_kwh,'kWh'), cost:'—'},
        {name:'电网合计', val:fmt(data.grid_in_kwh,'kWh'), cost:'US$'+(data.grid_cost_usd||0).toFixed(2)},
        {name:'燃气总计', val:fmt(data.gas_m3,'m³'), cost:'US$'+(data.gas_cost_usd||0).toFixed(2)},
        {name:'自来水总量', val:fmt(data.water_l,'L'), cost:'US$'+(data.water_cost_usd||0).toFixed(2)}
      ];
    }
    
    rows.forEach(function(r){
      var tr=document.createElement('tr');
      tr.innerHTML='<td>'+r.name+'</td><td>'+r.val+'</td><td>'+r.cost+'</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(thead); table.appendChild(tbody);
    box.innerHTML=''; box.appendChild(table);
  }
  function renderDistribution(data){
    if(!hasUI) return;
    var gtb=document.getElementById('val-grid-to-batt-kwh'); if(gtb) gtb.textContent=fmt(data.grid_to_batt_kwh||0,'kWh');
    var gth=document.getElementById('val-grid-to-house-kwh'); if(gth) gth.textContent=fmt(data.grid_to_house_kwh||0,'kWh');
    var bck=document.getElementById('val-batt-charge-kw'); if(bck) bck.textContent=fmt(data.battery_charge_kw||0,'kW');
    var bs=document.getElementById('val-batt-soc'); if(bs) bs.textContent=((data.battery_soc_percent||0)+'%');
    var brk=document.getElementById('val-batt-rem-kwh'); if(brk) brk.textContent=fmt(data.battery_remaining_kwh||0,'kWh');
    var btl=document.getElementById('val-batt-time-left'); if(btl) btl.textContent=(Math.round((data.battery_time_left_h||0)*10)/10+'h');
    var bthk=document.getElementById('val-batt-to-house-kw'); if(bthk) bthk.textContent=fmt(data.battery_to_house_kw||0,'kW');
    document.getElementById('val-house').textContent=fmt(data.house_kwh,'kWh');
    var g=document.getElementById('val-gas'); if(g) g.textContent=fmt(data.gas_m3,'m³');
    var w=document.getElementById('val-water'); if(w) w.textContent=fmt(data.water_l,'L');
  }
  var powerChart= powerChartDom ? echarts.init(powerChartDom) : null;
  var consChart= consChartDom ? echarts.init(consChartDom) : null;
  var priceChart= priceChartDom ? echarts.init(priceChartDom) : null;
  var feeChart= feeChartDom ? echarts.init(feeChartDom) : null;
  var priceCache={}; var feeCache={};
  var unitRate={CNY:1, USD:0.14, EUR:0.13};
  var unitLabelPrice={CNY:'元/kWh', USD:'$/kWh', EUR:'€/kWh'};
  var unitLabelFee={CNY:'元', USD:'$', EUR:'€'};
  if(powerChart){
    var isEN = location.pathname.indexOf('/en/')===0;
    powerChart.setOption({
      tooltip:{trigger:'axis'},
      xAxis:{type:'category',data:[]},
      yAxis:{type:'value',name:'kW'},
      series:[
        {type:'line',areaStyle:{},name:isEN?'Grid':'电网',data:[],smooth:true,itemStyle:{color:'#3b82f6'}},
        {type:'line',areaStyle:{},name:isEN?'Battery':'电池',data:[],smooth:true,itemStyle:{color:'#ec4899'}},
        {type:'line',name:isEN?'Building':'建筑',data:[],lineStyle:{width:3,type:'dashed'},smooth:true,itemStyle:{color:'#f59e0b'}}
      ]
    });
  }
  if(consChart){
    var isEN = location.pathname.indexOf('/en/')===0;
    consChart.setOption({
      tooltip:{trigger:'axis'},
      xAxis:{type:'category',data:[]},
      yAxis:{type:'value',name:'kWh'},
      series:[
        {type:'bar',name:isEN?'Grid':'电网',stack:'use',data:[],itemStyle:{color:'#3b82f6'}},
        {type:'bar',name:isEN?'Battery':'电池',stack:'use',data:[],itemStyle:{color:'#ec4899'}},
        {type:'line',name:isEN?'Building':'建筑',data:[],smooth:true,lineStyle:{width:3,type:'dashed'},itemStyle:{color:'#f59e0b'}}
      ]
    });
  }
  function load(){
    fetch('/api/energy/dashboard').then(function(r){return r.json()}).then(function(d){
      renderDistribution(d.summary);
      renderSourcesTable(d.summary);
      drawFlows();
      if(powerChart){
        var housePower = d.power_series.grid.map(function(v,i){return Number(v||0)+Number(d.power_series.battery[i]||0)});
        powerChart.setOption({
          xAxis:{data:d.times},
          series:[
            {data:d.power_series.grid},
            {data:d.power_series.battery},
            {data:housePower}
          ]
        });
      }
      if(consChart){
        var houseUse = d.use_series.grid.map(function(v,i){return Number(v||0)+Number(d.use_series.battery[i]||0)});
        consChart.setOption({
          xAxis:{data:d.times},
          series:[
            {data:d.use_series.grid},
            {data:d.use_series.battery},
            {data:houseUse}
          ]
        });
      }
    }).catch(function(){});
  }
  load();
  setInterval(load, 2000);
  window.addEventListener('resize', drawFlows);

  function drawFlows(){
    var svg=document.getElementById('energy-flows'); if(!svg) return;
    var cont=document.getElementById('energy-distribution'); if(!cont) return;
    while(svg.firstChild){svg.removeChild(svg.firstChild)}
    function center(id){
      var el=document.getElementById(id); if(!el) return {x:0,y:0};
      var r=el.getBoundingClientRect(); var c=cont.getBoundingClientRect();
      return {x:r.left - c.left + r.width/2, y:r.top - c.top + r.height/2};
    }
    function anchor(id, side){
      var el=document.getElementById(id); if(!el) return center(id);
      var r=el.getBoundingClientRect(); var c=cont.getBoundingClientRect();
      var cx=r.left - c.left + r.width/2, cy=r.top - c.top + r.height/2;
      var rad=Math.max(r.width,r.height)/2;
      if(side==='left') return {x:cx-rad, y:cy};
      if(side==='right') return {x:cx+rad, y:cy};
      if(side==='top') return {x:cx, y:cy-rad};
      if(side==='bottom') return {x:cx, y:cy+rad};
      return {x:cx, y:cy};
    }
    function pathBetween(aId,bId,color,id,fromSide,toSide,withDot){
      var a=anchor(aId,fromSide||'right'), b=anchor(bId,toSide||'left');
      var dx=Math.abs(b.x-a.x)/3;
      var d='M '+a.x+','+a.y+' C '+(a.x+dx)+','+a.y+' '+(b.x-dx)+','+b.y+' '+b.x+','+b.y;
      var p=document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d', d);
      p.setAttribute('class','flow-path');
      p.setAttribute('stroke', color);
      if(id) p.setAttribute('id', id);
      svg.appendChild(p);
      if(withDot){
        var count=6; var colorClass=withDot==='orange'?'orange':'blue';
        for(var i=0;i<count;i++){ 
          var dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
          dot.setAttribute('r','5'); dot.setAttribute('class','flow-dot '+colorClass);
          var anim=document.createElementNS('http://www.w3.org/2000/svg','animateMotion');
          anim.setAttribute('dur','2s'); anim.setAttribute('repeatCount','indefinite'); anim.setAttribute('begin',(i*0.25)+'s');
          var mpath=document.createElementNS('http://www.w3.org/2000/svg','mpath');
          mpath.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href','#'+id);
          anim.appendChild(mpath); dot.appendChild(anim); svg.appendChild(dot);
        }
      }
    }
    var mode=document.getElementById('tariff-toggle')?.dataset.mode||'low';
    // always draw all paths, but dot只在有效路径
    // 三角连接：电网-电池、 电网-建筑、 电池-建筑
    pathBetween('node-grid','node-battery','#cbd5e1','p-grid-batt','top','bottom', mode==='low'?'orange':false);
    pathBetween('node-grid','node-house','#cbd5e1','p-grid-house','right','left', mode==='low'?'blue':false);
    pathBetween('node-battery','node-house','#cbd5e1','p-batt-house','bottom','top', mode==='high'?'blue':false);
    var srcEl=document.getElementById('supply-source');
    var isEN = location.pathname.indexOf('/en/')===0;
    if(srcEl){ 
      if(mode==='high'){
        srcEl.textContent = isEN ? 'Battery' : '电池';
      } else {
        srcEl.textContent = isEN ? 'Grid' : '电网';
      }
    }
  }
  var toggle=document.getElementById('tariff-toggle');
  if(toggle){
    toggle.addEventListener('click',function(){
      var m=this.dataset.mode==='low'?'high':'low';
      this.dataset.mode=m;
      this.textContent=m==='low'?'低电价':'高电价';
      drawFlows();
    });
  }

  function refreshHistory(metric, period, opts){
    opts=opts||{}; var force=!!opts.forceFetch;
    var cache = (metric==='price') ? priceCache : feeCache;
    var unitSel = (metric==='price') ? (document.getElementById('price-unit')?.value||'CNY') : (document.getElementById('fee-unit')?.value||'CNY');
    function render(data){
      var rate = unitRate[unitSel]||1;
      var values = (data.values||[]).map(function(v){return Math.round(v*rate*100)/100});
      if(metric==='price' && priceChart){
        priceChart.setOption({xAxis:{type:'category',data:data.times},yAxis:{type:'value',name:unitLabelPrice[unitSel]},series:[{type:'bar',data:values,itemStyle:{color:'#f59e0b'}}]});
      } else if(metric==='cost' && feeChart){
        feeChart.setOption({xAxis:{type:'category',data:data.times},yAxis:{type:'value',name:unitLabelFee[unitSel]},series:[{type:'bar',data:values,itemStyle:{color:'#3b82f6'}}]});
      }
    }
    if(cache[period] && !force){ render(cache[period]); return }
    fetch('/api/energy/history?metric='+metric+'&period='+period).then(function(r){return r.json()}).then(function(d){
      cache[period]=d; render(d);
    })
  }
  function currentPricePeriod(){var tabs=document.querySelectorAll('#price-tabs .tab');for(var i=0;i<tabs.length;i++){if(tabs[i].classList.contains('active'))return tabs[i].dataset.period}return 'day'}
  function currentFeePeriod(){var tabs=document.querySelectorAll('#fee-tabs .tab');for(var i=0;i<tabs.length;i++){if(tabs[i].classList.contains('active'))return tabs[i].dataset.period}return 'day'}
  function bindTabs(id, metric){
    var box=document.getElementById(id); if(!box) return;
    box.addEventListener('click',function(e){
      if(e.target.classList.contains('tab')){
        box.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active')});
        e.target.classList.add('active');
        refreshHistory(metric, e.target.dataset.period, {forceFetch:false});
      }
    });
  }
  bindTabs('price-tabs','price');
  bindTabs('fee-tabs','cost');
  // unit change
  var priceUnit=document.getElementById('price-unit');
  var feeUnit=document.getElementById('fee-unit');
  if(priceUnit){ priceUnit.addEventListener('change', function(){ refreshHistory('price', currentPricePeriod(), {forceFetch:false}) }) }
  if(feeUnit){ feeUnit.addEventListener('change', function(){ refreshHistory('cost', currentFeePeriod(), {forceFetch:false}) }) }
  var priceRefresh=document.getElementById('price-refresh');
  var feeRefresh=document.getElementById('fee-refresh');
  if(priceRefresh){ priceRefresh.addEventListener('click', function(){ refreshHistory('price', currentPricePeriod(), {forceFetch:true}) }) }
  if(feeRefresh){ feeRefresh.addEventListener('click', function(){ refreshHistory('cost', currentFeePeriod(), {forceFetch:true}) }) }
  // initial fetch once
  refreshHistory('price', currentPricePeriod(), {forceFetch:true});
  refreshHistory('cost', currentFeePeriod(), {forceFetch:true});

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var mode = this.dataset.mode;
      // Optimistic UI update
      document.querySelectorAll('.mode-btn').forEach(function(b){b.classList.remove('active')});
      this.classList.add('active');
      
      fetch('/api/energy/mode', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode: mode})
      }).then(function(r){return r.json()}).then(function(d){
        if(d.status==='ok'){
          // Update Tariff toggle visually if needed
          var tToggle = document.getElementById('tariff-toggle');
          if(tToggle){
            if(mode === 'high'){
               tToggle.dataset.mode = 'low'; // High Power -> Low Price
               tToggle.textContent = (location.pathname.indexOf('/en/')===0) ? 'Low Tariff' : '低电价';
            } else {
               tToggle.dataset.mode = 'high'; // Others -> High Price
               tToggle.textContent = (location.pathname.indexOf('/en/')===0) ? 'High Tariff' : '高电价';
            }
            drawFlows();
          }
          // Force refresh dashboard data
          load();
        }
      });
    });
  });
}) 
