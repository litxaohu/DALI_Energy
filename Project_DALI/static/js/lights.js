document.addEventListener('DOMContentLoaded',function(){
  var grid=document.getElementById('lights-grid');
  var exportBtn=document.getElementById('export-devices');
  var importBtn=document.getElementById('import-devices');
  var importFile=document.getElementById('import-file');
  var portSelect=document.getElementById('port-select');
  var portRefresh=document.getElementById('port-refresh');
  var portConfirm=document.getElementById('port-confirm');
  var portStatus=document.getElementById('port-status');
  var gwHex=document.getElementById('gw-hex');
  var devAddrHex=document.getElementById('dev-addr-hex');
  var devName=document.getElementById('dev-name');
  var addBtn=document.getElementById('add-light');
  var selectedPort='/dev/ttyAMA3';
  var activePort='';
  function load(){
    fetch('/api/lights').then(function(r){return r.json()}).then(function(list){
      grid.innerHTML='';
      list.forEach(function(d){
        var card=document.createElement('div');
        card.className='device';
        var del=document.createElement('button');
        del.className='delete-btn';
        del.textContent='×';
        del.title='删除';
        del.addEventListener('click',function(){
          fetch('/api/lights/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:d.id})})
          .then(function(r){return r.json()}).then(function(resp){ if(resp.status==='ok'){ load() } });
        });
        var name=document.createElement('div');
        name.className='device-name';
        name.textContent=d.name+' (#'+d.address+')'+(d.gateway?' [GW '+d.gateway+']':'');
        var slider=document.createElement('input');
        slider.type='range';
        slider.min='0';
        slider.max='254';
        slider.value=String(d.level||0);
        var valueLabel=document.createElement('div');
        valueLabel.textContent='亮度: '+slider.value;
        var instr=document.createElement('div');
        instr.style.fontSize='12px'; instr.style.color='#6b7280';
        var sendBtn=document.createElement('button');
        sendBtn.textContent='发送';
        sendBtn.style.marginTop='6px';
        sendBtn.style.padding='6px 10px';
        sendBtn.style.border='none';
        sendBtn.style.borderRadius='6px';
        sendBtn.style.background='#2563eb';
        sendBtn.style.color='#fff';
        slider.addEventListener('input',function(){
          valueLabel.textContent='亮度: '+slider.value;
        });
        sendBtn.addEventListener('click',function(){
          var p = activePort || selectedPort;
          if(!p){ alert('请先确认串口'); return }
          fetch('/api/dali/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({port:p,gateway_hex:(d.gateway||'01'),address_dec:d.address,level:Number(slider.value)})})
          .then(function(r){return r.json()}).then(function(resp){
            if(resp.status==='ok'){instr.textContent='发送指令: '+(resp.instruction||'')+' (mode: '+resp.mode+')';}
          });
        });
        card.appendChild(name);
        card.appendChild(del);
        card.appendChild(slider);
        card.appendChild(valueLabel);
        card.appendChild(sendBtn);
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
  if(portConfirm){ portConfirm.addEventListener('click', function(){
    fetch('/api/system/set_port',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({port:selectedPort})})
    .then(function(r){return r.json()}).then(function(resp){
      if(resp.status==='ok'){ activePort=resp.port; portStatus.textContent='已设置: '+activePort }
    })
  }) }
  if(addBtn){
    addBtn.addEventListener('click',function(){
      var name=(devName.value||'').trim();
      var addrHex=(devAddrHex.value||'').trim();
      if(addrHex===''){return}
      var addr=parseInt(addrHex,16);
      if(isNaN(addr)){alert('设备号需为十六进制');return}
      var gw=(gwHex.value||'01').trim();
      if(!name){return}
      fetch('/api/lights/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,address_hex:addrHex,gateway_hex:gw,port:selectedPort})})
      .then(function(r){return r.json()}).then(function(resp){
        if(resp.status==='ok'){devName.value=''; devAddrHex.value=''; load()} else {
          alert(resp.msg||'添加失败');
        }
      })
    })
  }
  if(exportBtn){
    exportBtn.addEventListener('click', function(){
      fetch('/api/lights').then(function(r){return r.json()}).then(function(list){
        var blob=new Blob([JSON.stringify(list,null,2)],{type:'application/json'});
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a');
        a.href=url; a.download='devices.json';
        document.body.appendChild(a); a.click();
        setTimeout(function(){ URL.revokeObjectURL(url); a.remove() }, 0);
      })
    })
  }
  if(importBtn && importFile){
    importBtn.addEventListener('click', function(){ importFile.click() });
    importFile.addEventListener('change', function(){
      var file=importFile.files[0]; if(!file) return;
      var reader=new FileReader();
      reader.onload=function(){
        try{
          var data=JSON.parse(reader.result);
          fetch('/api/lights/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
          .then(function(r){return r.json()}).then(function(resp){ if(resp.status==='ok'){ load() } else { alert(resp.msg||'导入失败') } })
        }catch(e){ alert('文件格式错误') }
      };
      reader.readAsText(file);
      importFile.value='';
    });
  }
})
