document.addEventListener('DOMContentLoaded',function(){
  var isEN = location.pathname.indexOf('/en/')===0;
  var inputsBox=document.getElementById('inputs-list');
  var addInput=document.getElementById('add-input');
  var outputsBox=document.getElementById('outputs-list');
  var saveOutputs=document.getElementById('save-outputs');
  var publishNow=document.getElementById('publish-now');
  var testToggle=document.getElementById('test-toggle');
  var testJson=document.getElementById('test-json');
  var testFile=document.getElementById('test-file');
  var testApply=document.getElementById('test-apply');
  if(!inputsBox){return}
  var metricOptions=[
    {key:'solar_kwh', label:(isEN?'PV Yield Total':'光伏发电总量')},
    {key:'battery_total_kwh', label:(isEN?'Battery Total':'电池合计')},
    {key:'grid_in_kwh', label:(isEN?'Grid Import Total':'电网合计')},
    {key:'gas_m3', label:(isEN?'Gas Total':'燃气总计')},
    {key:'water_l', label:(isEN?'Water Total':'自来水总量')},
    {key:'grid_to_batt_kwh', label:(isEN?'Grid → Battery Energy':'电网向电池输入电量')},
    {key:'grid_to_house_kwh', label:(isEN?'Grid → Building Energy':'电网向建筑输入电量')},
    {key:'house_kwh', label:(isEN?'Building Consumption Total':'建筑用电总量')},
    {key:'battery_charge_kw', label:(isEN?'Battery Charge (kW)':'电池充电量(功率)')},
    {key:'battery_to_house_kw', label:(isEN?'Battery to House (kW)':'电池用电量(功率)')},
    {key:'battery_soc_percent', label:(isEN?'Battery SOC (%)':'电池剩余电量百分比')},
    {key:'battery_remaining_kwh', label:(isEN?'Battery Remaining Energy':'电池剩余电量')},
    {key:'battery_time_left_h', label:(isEN?'Battery Remaining Time (h)':'电池剩余使用时间(小时)')},
    {key:'realtime_price', label:(isEN?'Realtime Price':'实时电价')}
  ];
  function renderInputs(list){
    inputsBox.innerHTML='';
    list.forEach(function(s,si){
      var card=document.createElement('div'); card.className='metric-item';
      var head=document.createElement('div'); head.className='metric-row';
      var name=document.createElement('input'); name.value=s.name||(isEN?('Service'+(si+1)):('服务'+(si+1))); name.placeholder=(isEN?'Service Name':'服务名称');
      var host=document.createElement('input'); host.placeholder=(isEN?'Address':'地址'); host.value=s.host||'localhost';
      var port=document.createElement('input'); port.placeholder=(isEN?'Port':'端口'); port.type='number'; port.value=s.port||1883;
      var user=document.createElement('input'); user.placeholder=(isEN?'Username':'用户名'); user.value=s.username||'';
      var pass=document.createElement('input'); pass.placeholder=(isEN?'Password':'密码'); pass.type='password'; pass.value=s.password||'';
      var del=document.createElement('button'); del.textContent=(isEN?'Delete Service':'删除服务');
      del.addEventListener('click',function(){
        fetch('/api/mqtt_inputs/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id})})
        .then(function(r){return r.json()}).then(function(){loadAll()});
      });
      head.appendChild(name); head.appendChild(host); head.appendChild(port); head.appendChild(user); head.appendChild(pass); head.appendChild(del);
      card.appendChild(head);
      var topicsBox=document.createElement('div');
      (s.topics||[]).forEach(function(t,ti){
        var row=document.createElement('div'); row.className='metric-row';
        var topic=document.createElement('input'); topic.placeholder=(isEN?'Subscribe Topic':'订阅主题'); topic.value=t.topic||'';
        var delT=document.createElement('button'); delT.textContent=(isEN?'Delete Topic':'删除主题');
        delT.addEventListener('click',function(){
          (s.topics||[]).splice(ti,1); saveInputs(list);
        });
        row.appendChild(topic); row.appendChild(delT);
        var mapBox=document.createElement('div'); mapBox.className='metric-row';
        metricOptions.forEach(function(opt){
          var line=document.createElement('div'); line.style.display='flex'; line.style.gap='6px'; line.style.margin='4px 0';
          var selLabel=document.createElement('span'); selLabel.textContent=opt.label;
          var path=document.createElement('input'); path.placeholder=(isEN?'JSON Path (e.g. data.market.realtime_price)':'JSON路径 (如 data.market.realtime_price)');
          path.value=(t.mapping && t.mapping[opt.key])||'';
          line.appendChild(selLabel); line.appendChild(path);
          mapBox.appendChild(line);
          path.addEventListener('input', function(){
            t.mapping = t.mapping || {};
            t.mapping[opt.key] = path.value;
          });
        });
        card.appendChild(row);
        card.appendChild(mapBox);
      });
      var addTopic=document.createElement('button'); addTopic.textContent=(isEN?'Add Topic':'新增主题');
      addTopic.addEventListener('click',function(){
        s.topics = s.topics || [];
        s.topics.push({topic:'', mapping:{}});
        saveInputs(list);
      });
      var saveBtn=document.createElement('button'); saveBtn.textContent=(isEN?'Save Service':'保存服务');
      saveBtn.addEventListener('click',function(){
        s.name=name.value; s.host=host.value; s.port=Number(port.value||1883); s.username=user.value; s.password=pass.value;
        saveInputs(list);
      });
      var startBtn=document.createElement('button'); startBtn.textContent=(isEN?'Start Subscribe':'启动订阅');
      startBtn.addEventListener('click',function(){
        fetch('/api/mqtt_inputs/start',{method:'POST'}).then(function(r){return r.json()});
      });
      card.appendChild(addTopic); card.appendChild(saveBtn); card.appendChild(startBtn);
      inputsBox.appendChild(card);
    });
  }
  function saveInputs(list){
    fetch('/api/mqtt_inputs/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(list)}).then(function(r){return r.json()});
    loadAll();
  }
  function renderOutputs(list){
    outputsBox.innerHTML='';
    list.forEach(function(o,oi){
      var row=document.createElement('div'); row.className='metric-row';
      var host=document.createElement('input'); host.placeholder=(isEN?'Address':'地址'); host.value=o.host||'localhost';
      var port=document.createElement('input'); port.placeholder=(isEN?'Port':'端口'); port.type='number'; port.value=o.port||1883;
      var user=document.createElement('input'); user.placeholder=(isEN?'Username':'用户名'); user.value=o.username||'';
      var pass=document.createElement('input'); pass.placeholder=(isEN?'Password':'密码'); pass.type='password'; pass.value=o.password||'';
      var topic=document.createElement('input'); topic.placeholder=(isEN?'Topic':'主题'); topic.value=o.topic||'dali/energy/out';
      var del=document.createElement('button'); del.textContent=(isEN?'Delete':'删除');
      del.addEventListener('click',function(){ list.splice(oi,1); saveOutputsFn(list) });
      row.appendChild(host); row.appendChild(port); row.appendChild(user); row.appendChild(pass); row.appendChild(topic); row.appendChild(del);
      outputsBox.appendChild(row);
      host.addEventListener('input',function(){ o.host=host.value }); port.addEventListener('input',function(){ o.port=Number(port.value||1883) }); user.addEventListener('input',function(){ o.username=user.value }); pass.addEventListener('input',function(){ o.password=pass.value }); topic.addEventListener('input',function(){ o.topic=topic.value });
    });
    var add=document.createElement('button'); add.textContent=(isEN?'Add Output Service':'新增输出服务'); add.addEventListener('click',function(){ list.push({host:'localhost',port:1883,username:'',password:'',topic:'dali/energy/out'}); saveOutputsFn(list) });
    outputsBox.appendChild(add);
    if(saveOutputs){ saveOutputs.onclick=function(){ saveOutputsFn(list) } }
    if(publishNow){ publishNow.onclick=function(){ fetch('/api/mqtt_outputs/publish_now',{method:'POST'}).then(function(r){return r.json()}) } }
  }
  function saveOutputsFn(list){
    fetch('/api/mqtt_outputs/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(list)}).then(function(r){return r.json()});
    loadAll();
  }
  function loadAll(){
    fetch('/api/mqtt_inputs').then(function(r){return r.json()}).then(function(inputs){
      if(!Array.isArray(inputs)){inputs=[]}
      inputs.forEach(function(s,i){ if(!s.id){ s.id = 'svc_'+(Date.now()+i) } });
      renderInputs(inputs);
    });
    fetch('/api/mqtt_outputs').then(function(r){return r.json()}).then(function(outputs){
      if(!Array.isArray(outputs)){outputs=[]}
      renderOutputs(outputs);
    });
  }
  loadAll();
  if(addInput){
    addInput.addEventListener('click',function(){
      fetch('/api/mqtt_inputs').then(function(r){return r.json()}).then(function(inputs){
        if(!Array.isArray(inputs)){inputs=[]}
        inputs.push({id:'svc_'+Date.now(),name:'新服务',host:'localhost',port:1883,username:'',password:'',topics:[]});
        saveInputs(inputs);
      });
    });
  }
  if(testToggle){
    testToggle.addEventListener('change',function(){
      fetch('/api/interfaces/test/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:testToggle.checked})});
    });
  }
  if(testApply){
    testApply.addEventListener('click',function(){
      var txt=testJson.value||'{}';
      try{
        var data=JSON.parse(txt);
        fetch('/api/interfaces/test/set',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(function(r){return r.json()})
        .then(function(resp){
          if(resp.status==='ok'){
            alert('测试数据导入成功');
            if(testToggle && !testToggle.checked){
              testToggle.checked = true;
              fetch('/api/interfaces/test/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true})});
            }
          } else { alert(resp.msg||'导入失败') }
        });
      }catch(e){ alert('JSON格式错误') }
    });
  }
  if(testFile){
    testFile.addEventListener('change',function(){
      var file=testFile.files[0]; if(!file) return;
      var reader=new FileReader();
      reader.onload=function(){ testJson.value=reader.result||'' };
      reader.readAsText(file);
      testFile.value='';
    });
  }
})
