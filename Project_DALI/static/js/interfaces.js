document.addEventListener('DOMContentLoaded',function(){
  var metricsBox=document.getElementById('metrics');
  var form=document.getElementById('mqtt-form');
  var host=document.getElementById('mqtt-host');
  var port=document.getElementById('mqtt-port');
  var username=document.getElementById('mqtt-username');
  var password=document.getElementById('mqtt-password');
  var statusEl=document.getElementById('mqtt-status');
  if(!metricsBox){return}
  function load(){
    fetch('/api/interfaces').then(function(r){return r.json()}).then(function(d){
      host.value=d.mqtt.host||'localhost';
      port.value=d.mqtt.port||1883;
      username.value=d.mqtt.username||'';
      password.value=d.mqtt.password||'';
      statusEl.textContent=d.mqtt_status.connected?'已连接':'未连接';
      metricsBox.innerHTML='';
      d.metrics.forEach(function(m){
        var card=document.createElement('div'); card.className='metric-item';
        var title=document.createElement('div'); title.className='metric-title'; title.textContent=m.key+' ('+m.label+')';
        var enable=document.createElement('input'); enable.type='checkbox'; enable.checked=!!m.enabled;
        var sub=document.createElement('input'); sub.placeholder='订阅主题'; sub.value=m.subscribe_topic||'';
        var pub=document.createElement('input'); pub.placeholder='发送主题'; pub.value=m.publish_topic||'';
        var test=document.createElement('input'); test.placeholder='测试数据 JSON'; test.value=JSON.stringify(m.test_data||{});
        var saveBtn=document.createElement('button'); saveBtn.textContent='保存';
        var sendBtn=document.createElement('button'); sendBtn.textContent='发送测试';
        saveBtn.addEventListener('click',function(){
          var body={key:m.key,enabled:enable.checked,subscribe_topic:sub.value,publish_topic:pub.value,test_data:{}};
          try{body.test_data=JSON.parse(test.value)}catch(e){body.test_data={}}
          fetch('/api/interfaces/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(){load()});
        });
        sendBtn.addEventListener('click',function(){
          var payload={key:m.key};
          try{payload.data=JSON.parse(test.value)}catch(e){payload.data={}}
          fetch('/api/interfaces/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(){});
        });
        var row=document.createElement('div'); row.className='metric-row';
        var row2=document.createElement('div'); row2.className='metric-row';
        var row3=document.createElement('div'); row3.className='metric-row';
        row.appendChild(title); row.appendChild(enable);
        row2.appendChild(sub); row2.appendChild(pub);
        row3.appendChild(test); row3.appendChild(saveBtn); row3.appendChild(sendBtn);
        card.appendChild(row); card.appendChild(row2); card.appendChild(row3);
        metricsBox.appendChild(card);
      });
    });
  }
  load();
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      fetch('/api/mqtt/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true,host:host.value,port:Number(port.value||1883),username:username.value,password:password.value,topic:'dali/energy'})}).then(function(){load()});
    });
  }
})
