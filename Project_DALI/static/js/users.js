document.addEventListener('DOMContentLoaded',function(){
  var list=document.getElementById('users-list');
  var form=document.getElementById('user-add-form');
  var u=document.getElementById('new-username');
  var p=document.getElementById('new-password');
  if(!list){return}
  function load(){
    fetch('/api/users').then(function(r){return r.json()}).then(function(arr){
      var table=document.createElement('table');
      table.style.width='100%';
      var thead=document.createElement('thead');
      thead.innerHTML='<tr><th style="text-align:left">用户名</th><th style="text-align:left">操作</th></tr>';
      var tbody=document.createElement('tbody');
      arr.forEach(function(it){
        var tr=document.createElement('tr');
        var td1=document.createElement('td'); td1.textContent=it.username;
        var td2=document.createElement('td');
        var del=document.createElement('button'); del.textContent='删除';
        del.addEventListener('click',function(){
          fetch('/api/users/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:it.username})})
          .then(function(r){return r.json()}).then(function(){load()})
        });
        td2.appendChild(del);
        tr.appendChild(td1); tr.appendChild(td2);
        tbody.appendChild(tr);
      });
      table.appendChild(thead); table.appendChild(tbody);
      list.innerHTML='';
      list.appendChild(table);
    });
  }
  load();
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var username=u.value.trim(); var password=p.value;
      if(!username||!password){return}
      fetch('/api/users/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username,password:password})})
      .then(function(r){return r.json()}).then(function(){
        u.value=''; p.value=''; load();
      });
    });
  }
})
