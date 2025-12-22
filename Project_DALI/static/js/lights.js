document.addEventListener('DOMContentLoaded',async function(){
  var grid=document.getElementById('lights-grid');
  var scan=document.getElementById('scan-devices');
  var gwHex=document.getElementById('gw-hex');
  var devAddr=document.getElementById('dev-addr');
  var devName=document.getElementById('dev-name');
  var addBtn=document.getElementById('add-light');
  var connectBtn=document.getElementById('serial-connect');
  var statusEl=document.getElementById('serial-status');
  var port=null, writer=null;
  function getLocalList(){ try{ return JSON.parse(localStorage.getItem('localLights')||'[]') }catch(e){ return [] } }
  function setLocalList(list){ localStorage.setItem('localLights', JSON.stringify(list||[])) }
  function toHex2(n){ var s = Number(n)&0xFF; return s.toString(16).toUpperCase().padStart(2,'0') }
  function buildInstr(gwHexStr, addrDec, level){
    var start='28', fixed='01', ctrl='12';
    var gw=String(gwHexStr||'01').toUpperCase().padStart(2,'0');
    var dev=toHex2(Number(addrDec)*2);
    var cmd=toHex2(Number(level));
    var parts=[start,fixed,gw,ctrl,dev,cmd];
    var sum=parts.reduce(function(acc,p){return (acc + parseInt(p,16))&0xFF},0);
    var chk=toHex2(sum);
    var hex=parts.join('')+chk;
    var bytes=new Uint8Array(hex.match(/.{1,2}/g).map(function(h){return parseInt(h,16)}));
    return {hex:hex, bytes:bytes};
  }
  async function ensureSerial(){
    if(!('serial' in navigator)){ alert('此浏览器不支持 Web Serial API'); return false }
    if(!port){ try{ port = await navigator.serial.requestPort(); await port.open({ baudRate: 9600 }); writer = port.writable.getWriter(); statusEl.textContent='已连接'; } catch(e){ statusEl.textContent='连接失败'; return false } }
    return true;
  }
  function render(){
    var list=getLocalList();
    grid.innerHTML='';
    list.forEach(function(d, idx){
      var card=document.createElement('div'); card.className='device';
      var name=document.createElement('div'); name.className='device-name'; name.textContent=d.name+' (#'+d.address+') [GW '+(d.gateway||'01')+']';
      var slider=document.createElement('input'); slider.type='range'; slider.min='0'; slider.max='255'; slider.value=String(d.level||0);
      var valueLabel=document.createElement('div'); valueLabel.textContent='亮度: '+slider.value;
      var instr=document.createElement('div'); instr.style.fontSize='12px'; instr.style.color='#6b7280';
      slider.addEventListener('input', function(){ valueLabel.textContent='亮度: '+slider.value });
      slider.addEventListener('change', async function(){
        var ins=buildInstr(d.gateway||'01', d.address, Number(slider.value));
        instr.textContent='发送指令: '+ins.hex;
        if(await ensureSerial()){ try{ await writer.write(ins.bytes) } catch(e){ statusEl.textContent='发送失败' } }
        d.level = Number(slider.value);
        list[idx]=d; setLocalList(list);
      });
      card.appendChild(name); card.appendChild(slider); card.appendChild(valueLabel); card.appendChild(instr); grid.appendChild(card);
    });
  }
  render();
  if(addBtn){
    addBtn.addEventListener('click', function(){
      var name=(devName.value||'').trim();
      var addr=Number(devAddr.value||0);
      var gw=(gwHex.value||'01').trim();
      if(!name||!addr){return}
      var list=getLocalList();
      if(list.some(function(it){return Number(it.address)===addr})){ return }
      list.push({id: (list.length?Math.max.apply(null,list.map(function(i){return i.id||0}))+1:1), address: addr, name: name, level: 0, gateway: gw});
      setLocalList(list);
      devName.value=''; devAddr.value='';
      render();
    });
  }
  if(connectBtn){ connectBtn.addEventListener('click', ensureSerial) }
  if(scan){
    scan.addEventListener('click', function(){
      // 保留按钮，不再调用后端；可根据需要从设备重新加载，本示例仅刷新本地
      render();
    });
  }
})
