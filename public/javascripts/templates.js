jade=function(e){function t(e){return e!=null}return Array.isArray||(Array.isArray=function(e){return"[object Array]"==Object.prototype.toString.call(e)}),Object.keys||(Object.keys=function(e){var t=[];for(var n in e)e.hasOwnProperty(n)&&t.push(n);return t}),e.merge=function(n,r){var i=n["class"],s=r["class"];if(i||s)i=i||[],s=s||[],Array.isArray(i)||(i=[i]),Array.isArray(s)||(s=[s]),i=i.filter(t),s=s.filter(t),n["class"]=i.concat(s).join(" ");for(var o in r)o!="class"&&(n[o]=r[o]);return n},e.attrs=function(n,r){var i=[],s=n.terse;delete n.terse;var o=Object.keys(n),u=o.length;if(u){i.push("");for(var a=0;a<u;++a){var f=o[a],l=n[f];"boolean"==typeof l||null==l?l&&(s?i.push(f):i.push(f+'="'+f+'"')):0==f.indexOf("data")&&"string"!=typeof l?i.push(f+"='"+JSON.stringify(l)+"'"):"class"==f&&Array.isArray(l)?i.push(f+'="'+e.escape(l.join(" "))+'"'):r&&r[f]?i.push(f+'="'+e.escape(l)+'"'):i.push(f+'="'+l+'"')}}return i.join(" ")},e.escape=function(t){return String(t).replace(/&(?!(\w+|\#\d+);)/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")},e.rethrow=function(t,n,r){if(!n)throw t;var i=3,s=require("fs").readFileSync(n,"utf8"),o=s.split("\n"),u=Math.max(r-i,0),a=Math.min(o.length,r+i),i=o.slice(u,a).map(function(e,t){var n=t+u+1;return(n==r?"  > ":"    ")+n+"| "+e}).join("\n");throw t.path=n,t.message=(n||"Jade")+":"+r+"\n"+i+"\n\n"+t.message,t},e}({}),jade.templates={},jade.render=function(e,t,n){var r=jade.templates[t](n);e.innerHTML=r},jade.templates.event_template=function(locals,attrs,escape,rethrow,merge){attrs=attrs||jade.attrs,escape=escape||jade.escape,rethrow=rethrow||jade.rethrow,merge=merge||jade.merge;var buf=[];with(locals||{}){var interp;buf.push('<div class="list-group-item">('+((interp=event.clan.region)==null?"":interp)+")<i>");var __val__=" "+event.name;buf.push(escape(null==__val__?"":__val__)),buf.push("</i>"),ch==1?buf.push(" joined clan"):buf.push(" left clan"),buf.push("<b> ["+escape((interp=event.clan.tag)==null?"":interp)+"]</b>");var __val__=" "+event.clan.name;buf.push(escape(null==__val__?"":__val__)),buf.push("</div>")}return buf.join("")},jade.templates.request_template=function(locals,attrs,escape,rethrow,merge){attrs=attrs||jade.attrs,escape=escape||jade.escape,rethrow=rethrow||jade.rethrow,merge=merge||jade.merge;var buf=[];with(locals||{}){var interp;buf.push("<div"),buf.push(attrs({id:worker+"_req_"+ID,"class":"list-group-item "+((req.duration?"finished":"active")+(req.error?" list-group-item-danger":""))},{"class":!0,id:!0})),buf.push(">");if(req.duration){buf.push('<div class="badge">');var __val__=req.duration+" ms";buf.push(escape(null==__val__?"":__val__)),buf.push("</div>")}else{buf.push('<div class="badge">');var __val__=(new Date).getTime()-req.start.getTime()+" ms";buf.push(escape(null==__val__?"":__val__)),buf.push("</div>")}buf.push("<b>");var __val__="#"+ID;buf.push(escape(null==__val__?"":__val__)),buf.push("</b>");var __val__=" ("+req.task.region+")";buf.push(escape(null==__val__?"":__val__)),buf.push("<i>");var __val__=req.error?" - "+req.error:" - "+req.count+" clans";buf.push(escape(null==__val__?"":__val__)),buf.push("</i>"),minutes=req.start.getMinutes().toString(),seconds=req.start.getSeconds().toString(),minutesString="00".slice(0,minutes.length-2)+minutes,secondsString="00".slice(0,seconds.length-2)+seconds,buf.push("<small>");var __val__=" (Start:&nbsp;"+req.start.getHours()+":"+minutesString+":"+secondsString+")";buf.push(escape(null==__val__?"":__val__)),buf.push("</small></div>")}return buf.join("")}