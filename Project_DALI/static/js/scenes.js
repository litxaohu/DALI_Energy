document.addEventListener('DOMContentLoaded',function(){
  var isEN = location.pathname.indexOf('/en/')===0;
  var box=document.getElementById('scenes');
  var portSelect=document.getElementById('scene-port-select');
  var portRefresh=document.getElementById('scene-port-refresh');
  var portConfirm=document.getElementById('scene-port-confirm');
  var portStatus=document.getElementById('scene-port-status');
  var btnOn=document.getElementById('btn-all-on');
  var btnOff=document.getElementById('btn-all-off');
  var info=document.getElementById('scene-send-info');
  var selectedPort='/dev/ttyAMA3';
  var activePort='';
  function loadPorts(){
    fetch('/api/system/scan_ports').then(function(r){return r.json()}).then(function(list){
      portSelect.innerHTML='';
      list.forEach(function(p){
        var opt=document.createElement('option'); opt.value=p; opt.textContent=p; portSelect.appendChild(opt);
      });
      selectedPort=portSelect.value||selectedPort;
    });
  }
  if(portSelect){ portSelect.addEventListener('change', function(){ selectedPort=this.value }) }
  if(portRefresh){ portRefresh.addEventListener('click', function(){ loadPorts() }) }
  if(portConfirm){ portConfirm.addEventListener('click', function(){
    fetch('/api/system/set_port',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({port:selectedPort})})
    .then(function(r){return r.json()}).then(function(resp){
      if(resp.status==='ok'){ activePort=resp.port; portStatus.textContent='已设置: '+activePort }
    });
  }) }
  loadPorts();
  function sendHex(hex){
    var p = activePort || selectedPort;
    if(!p){ alert(isEN?'Please confirm serial port first':'请先确认串口'); return }
    fetch('/api/dali/send_hex',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({port:p, hex:hex})})
    .then(function(r){return r.json()}).then(function(resp){
      if(resp.status==='ok'){ info.textContent=(isEN?'Sent command: ':'发送指令: ')+hex+' (mode: '+resp.mode+')' }
    });
  }
  if(btnOn){ btnOn.addEventListener('click', function(){ sendHex('28010112fefe38') }) }
  if(btnOff){ btnOff.addEventListener('click', function(){ sendHex('28010112fe003a') }) }
  // load scenes list buttons (retain existing)
  fetch('/api/scenes').then(function(r){return r.json()}).then(function(list){
    list.forEach(function(s){
      var btn=document.createElement('button'); btn.textContent=s.name;
      btn.addEventListener('click',function(){
        fetch('/api/scenes/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scene_id:s.id})})
        .then(function(r){return r.json()}).then(function(){});
      });
      box.appendChild(btn);
    });
  });

  // Mode buttons
  function updateModeButtons(mode) {
    document.querySelectorAll('.mode-btn').forEach(function(b){
      b.classList.remove('active');
      if(b.dataset.mode === mode) b.classList.add('active');
    });
  }

  // Fetch initial mode
  fetch('/api/energy/mode').then(function(r){return r.json()}).then(function(d){
    if(d.status==='ok') updateModeButtons(d.mode);
  });

  // Handle clicks
  document.querySelectorAll('.mode-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var mode = this.dataset.mode;
      updateModeButtons(mode);
      fetch('/api/energy/mode', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode: mode})
      }).then(function(r){return r.json()}).then(function(d){
        if(d.status==='ok'){
          var log = document.getElementById('scene-log');
          if(log) log.innerHTML = '<div class="log-item">' + 
            (isEN ? 'Switched to mode: ' : '已切换模式: ') + mode + 
            ' <span class="time">'+new Date().toLocaleTimeString()+'</span></div>' + log.innerHTML;
        }
      });
    });
  });
})
