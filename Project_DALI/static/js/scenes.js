document.addEventListener('DOMContentLoaded',function(){
  var box=document.getElementById('scenes');
  function refreshLights(){
    var event=new Event('change');
  }
  function loadScenes(){
    fetch('/api/scenes').then(function(r){return r.json()}).then(function(list){
      box.innerHTML='';
      list.forEach(function(s){
        var btn=document.createElement('button');
        btn.textContent=s.name;
        btn.addEventListener('click',function(){
          fetch('/api/scenes/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scene_id:s.id})})
          .then(function(r){return r.json()}).then(function(){
            fetch('/api/lights').then(function(r){return r.json()});
          });
        });
        box.appendChild(btn);
      });
    });
  }
  loadScenes();
})
