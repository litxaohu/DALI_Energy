document.addEventListener('DOMContentLoaded',function(){
  var grid=document.getElementById('lights-grid');
  var scan=document.getElementById('scan-devices');
  var portSelect=document.getElementById('port-select');
  var portRefresh=document.getElementById('port-refresh');
  var gwHex=document.getElementById('gw-hex');
  var devAddr=document.getElementById('dev-addr');
  var devName=document.getElementById('dev-name');
  var addBtn=document.getElementById('add-light');
  var selectedPort='/dev/ttyAMA3';
  function load(){
    fetch('/api/lights').then(function(r){return r.json()}).then(function(list){
      grid.innerHTML='';
      list.forEach(function(d){
        var card=document.createElement('div');
        card.className='device';
        var name=document.createElement('div');
        name.className='device-name';
        name.textContent=d.name+' (#'+d.address+')'+(d.gateway?' [GW '+d.gateway+']':'');
        var slider=document.createElement('input');
        slider.type='range';
        slider.min='0';
        slider.max='255';
        slider.value=String(d.level||0);
        var valueLabel=document.createElement('div');
        valueLabel.textContent='亮度: '+slider.value;
        var instr=document.createElement('div');
        instr.style.fontSize='12px'; instr.style.color='#6b7280';
        slider.addEventListener('input',function(){
          valueLabel.textContent='亮度: '+slider.value;
        });
        slider.addEventListener('change',function(){
          fetch('/api/dali/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({port:selectedPort,gateway_hex:(d.gateway||'01'),address_dec:d.address,level:Number(slider.value)})})
          .then(function(r){return r.json()}).then(function(resp){
            if(resp.status==='ok'){instr.textContent='发送指令: '+(resp.instruction||'')+' (mode: '+resp.mode+')';}
          });
        });
        card.appendChild(name);
        card.appendChild(slider);
        card.appendChild(valueLabel);
        card.appendChild(instr);
        grid.appendChild(card);
      });
    });
  }
  function loadPorts(){
    fetch('/api/system/scan_ports').then(function(r){return r.json()}).then(function(list){
      portSelect.innerHTML='';
      list.forEach(function(p){
        var opt=document.createElement('option'); opt.value=p; opt.textContent=p; portSelect.appendChild(opt);
      });
      selectedPort=portSelect.value||selectedPort;
    });
  }
  load();
  loadPorts();
  if(portSelect){ portSelect.addEventListener('change', function(){ selectedPort=this.value }) }
  if(portRefresh){ portRefresh.addEventListener('click', function(){ loadPorts() }) }
  if(addBtn){
    addBtn.addEventListener('click',function(){
      var name=(devName.value||'').trim();
      var addr=Number(devAddr.value||0);
      var gw=(gwHex.value||'01').trim();
      if(!name||!addr){return}
      fetch('/api/lights/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,address_dec:addr,gateway_hex:gw,port:selectedPort})})
      .then(function(r){return r.json()}).then(function(resp){
        if(resp.status==='ok'){devName.value=''; devAddr.value=''; load()}
      })
    })
  }
  if(scan){
    scan.addEventListener('click',function(){
      fetch('/api/dali/scan_devices',{method:'POST'}).then(function(r){return r.json()}).then(function(){load()});
    });
  }
})
