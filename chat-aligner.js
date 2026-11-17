(function(){
  "use strict";

  // ===== 实测字宽表（1 行 = 97px，已一比一还原用户截图 13 行）=====
  var W = { cn:14, digit:6.5, dash:6, upperW:11, upper:10, lower:9 };
  var state = {
    cap: 97, emojiW: 22, maxEmoji: 1, emojiFace: "😮",
    style: "mix", customFill: "-", autoSplit: true, fillPos: "smart",
    qty: {},                                   // 算钱：{ 名字@第几个 : 数量 }
    price: {}                                  // 算钱：手改过的单价 { 名字@第几个 : 万 }
  };
  // "安全线" = 一行减去最窄字符的宽度：只要多出来的空白装不下任何一个字符，下一段必然被挤到新行
  var SAFE = function(){ return Math.min(W.cn, W.digit, W.dash, W.upperW, W.upper, W.lower) || W.dash; };
  var THIN = 48;                      // 缺口超过这么多 px 就算"这段太空"，八成是被空格切碎的半句话
  var $ = function(id){ return document.getElementById(id); };

  function isFullwidth(code){
    return (code>=0x1100 && (code<=0x115f || code===0x2329 || code===0x232a ||
      (code>=0x2e80&&code<=0xa4cf&&code!==0x303f) || (code>=0xac00&&code<=0xd7a3) ||
      (code>=0xf900&&code<=0xfaff) || (code>=0xfe10&&code<=0xfe19) ||
      (code>=0xfe30&&code<=0xfe6f) || (code>=0xff00&&code<=0xff60) ||
      (code>=0xffe0&&code<=0xffe6) || (code>=0x1f300&&code<=0x1faff) ||
      (code>=0x20000&&code<=0x3fffd)));
  }
  function pxOf(ch){
    if(ch>="0" && ch<="9") return W.digit;
    if(ch==="W" || ch==="M") return W.upperW;
    if(ch>="A" && ch<="Z") return W.upper;
    if(ch>="a" && ch<="z") return W.lower;
    if(ch===" ") return W.dash;
    if(/[-=._+#:!?/\\|,;'"()\[\]]/.test(ch)) return W.dash;
    var c = ch.codePointAt(0);
    if(isFullwidth(c)) return W.cn;
    return 6.5;
  }
  function textWidth(s){
    var w=0, arr=Array.from(s);
    for(var i=0;i<arr.length;i++) w += pxOf(arr[i]);
    return w;
  }
  var FORMAT_RE = /#[A-Za-z][0-9A-Fa-f]{6}|#[A-Za-z]/g;
  function tokenize(line){
    var raw=[], re=/#\d+/g, last=0, m;
    function pt(s){ if(s) raw.push({type:"text", text:s, width:textWidth(s)}); }
    while((m=re.exec(line))!==null){
      pt(line.slice(last,m.index));
      // 表情码只有 1~2 位；`#32140` 这种是 #32 和 140 粘在一起了，拆开算，别让 140 白白消失
      var code=m[0], dg=code.slice(1), emo=code, rest="";
      if(dg.length >= 4){ emo = "#" + dg.slice(0,2); rest = dg.slice(2); }
      raw.push({type:"emoji", text:emo, width:state.emojiW});
      if(rest) raw.push({type:"text", text:rest, width:textWidth(rest)});
      last = m.index + m[0].length;
    }
    pt(line.slice(last));
    var out=[];
    raw.forEach(function(t){
      if(t.type!=="text"){ out.push(t); return; }
      var s=t.text, x=0, fm, fre=new RegExp(FORMAT_RE.source,"g");
      while((fm=fre.exec(s))!==null){
        if(fm.index>x) out.push({type:"text", text:s.slice(x,fm.index), width:textWidth(s.slice(x,fm.index))});
        out.push({type:"fmt", text:fm[0], width:0});
        x = fm.index + fm[0].length;
      }
      if(x<s.length) out.push({type:"text", text:s.slice(x), width:textWidth(s.slice(x))});
    });
    return out;
  }
  function tokensWidth(ts){ var w=0; for(var i=0;i<ts.length;i++) w+=ts[i].width; return w; }
  function lineWidth(line){ return tokensWidth(tokenize(line)); }
  function fmtW(v){ return (Math.round(v*10)/10).toString(); }

  // 一条占到多少 px 才算"必然换行"：留白小于最窄字符(6px)即可
  function isSafe(w){ return w > state.cap - SAFE() - 0.01; }

  /* ================= 填充 ================= */
  function fillString(gap, base){
    if(gap <= 0.2) return "";
    var st=state.style, s="", left=gap, i, n;
    var had = (base ? (String(base).match(/#\d+/g)||[]).length : 0);
    var quota = (st==="mix" || st==="emoji" || st==="custom") ? Math.max(0, state.maxEmoji - had) : 0;

    // 表情后面必须紧跟一个分隔符：否则下一条若以数字开头，会粘成 #32140 被游戏当表情吃掉
    var sep = fillCharFor(base, st) || "-";
    var EMO = state.emojiW + W.dash;
    // 表情配额：缺口够"表情 + 分隔符"才放
    if(st!=="space" && st!=="custom"){
      while(quota>0 && left >= EMO - 0.01){
        s += "#32" + sep; left -= EMO; quota--;
      }
    }
    // 自定义字符
    if(st==="custom" && state.customFill){
      var isEmo = /#\d+/.test(state.customFill);          // 自定义里写表情码时也要受配额限制
      var glued = isEmo && /\d$/.test(state.customFill);  // 结尾是数字 → 自己再补一个分隔
      var uw = lineWidth(state.customFill) + (glued ? W.dash : 0), g=0;
      if(uw > 0){
        while(left >= uw - 0.01 && g++ < 300){
          if(isEmo && quota <= 0) break;
          s += state.customFill + (glued ? sep : ""); left -= uw;
          if(isEmo) quota--;
        }
      }
    }
    // 其余用 6px 单元补 —— 同一排只用一种符号
    var sym = fillCharFor(base, st);
    n = Math.floor((left + 0.01) / W.dash);
    for(i=0;i<n;i++){
      if(st==="eq") s += "=";
      else if(st==="space") s += " ";
      else if(st==="alt") s += (i%2===0 ? "=" : "-");
      else if(st==="custom") s += (sym || "-");
      else s += sym;                                   // mix：跟这条原文同一种符号
    }
    return s;
  }

  // 这条该用哪种填充符号：原文已经有 = 就用 =，已经只有 - 就用 -，都没有才用 -
  function fillCharFor(base, st){
    if(st==="eq") return "=";
    if(st==="space") return " ";
    if(st==="dash") return "-";
    if(st==="custom") return null;
    if(st==="alt") return null;
    var t = String(base||"").replace(/#[A-Za-z][0-9A-Fa-f]{6}|#[A-Za-z]|#\d+/g, "");
    if(/=/.test(t)) return "=";      // 原文里有等号，就整排用等号（读起来像"项目 = 价格"）
    return "-";
  }

  // 一排只用一种符号：把这条里所有的 - / = 都换成同一种（两者都是 6px，宽度不变）
  function unifySymbol(line, sym){
    if(!sym || (sym !== "=" && sym !== "-")) return line;
    return String(line).replace(/[-=]/g, sym);   // 颜色码/表情码里不含 - 和 =，放心替换
  }

  // 表情码后面直接跟数字（#32 + 140灵饰）会被游戏当成 #32140 这种不存在的表情，把数字吞掉
  // → 中间补一个 - 隔开。只处理 4 位以上的数字串，#100 这类三位表情不碰
  function fixEmojiGlue(s){
    return String(s).replace(/#(\d{2})(\d{2,})/g, "#$1-$2");
  }

  /* ================= 补在哪：名称后 / 尾部 ================= */
  // 把颜色码和表情码挖成等长的占位符，这样正则找到的下标能直接用在原文上
  function maskCodes(s){
    return String(s).replace(/#[A-Za-z][0-9A-Fa-f]{6}|#[A-Za-z]|#\d+/g, function(m){
      var r=""; for(var i=0;i<m.length;i++) r += "\u0001"; return r;
    });
  }
  // 插入点 = 最后一个数字串（= 价格）之前；前面没有名字就返回 -1，退回尾部补
  function midPos(line){
    var ms = maskCodes(line), re = /\d+(?:\.\d+)?/g, m, last = null;
    while((m = re.exec(ms)) !== null) last = m;
    if(!last || last.index === 0) return -1;
    var head = ms.slice(0, last.index);
    if(!/[\u4e00-\u9fa5A-Za-z]/.test(head)) return -1;   // 前面只有符号（如 "==5W"）就别插手
    return last.index;
  }
  // 填充串拆成"单元"：#32 连同紧跟的分隔符算一个整体，其它一字符一个
  function fillUnits(f){
    var out=[], i=0, n=f.length, m;
    while(i<n){
      m = /^#\d+/.exec(f.slice(i));
      if(m){
        var u = m[0]; i += u.length;
        if(i<n && /[-= ]/.test(f.charAt(i))){ u += f.charAt(i); i++; }  // 分隔符跟着表情走，别被排到它前面
        out.push(u);
      }else{ out.push(f.charAt(i)); i++; }
    }
    return out;
  }
  // 补满一条：新补的符号往名称后塞，表情一律留行尾（自带 - 分隔，防数字粘连）
  // carry = 你原来就写在行尾的那串符号，原地保留不动，免得每点一次就左右抖一次
  function padWith(line, gap, carry, base, force){
    var pos = midPos(line);
    // 一键对准：名称后本来就有 2 个以上符号，就别再把尾部那串搬过来堆成一坨
    if(force && pos >= 0){
      var pre = line.slice(0,pos), mm = (pre.match(/[-=]+$/) || [""])[0].length;
      if(mm >= 2) force = false;
    }
    var f = fillString(gap, base || (line + (carry || "")));
    if(force) f = (carry || "") + f;        // 一键对准：连旧尾部符号一起重新分配
    var tail = force ? "" : (carry || "");
    if(!f && !tail) return line;
    if(state.fillPos === "tail" || pos < 0) return line + tail + f;
    var us = fillUnits(f), emos=[], syms=[];
    us.forEach(function(u){ (/^#\d+/.test(u) ? emos : syms).push(u); });
    var k;
    if(state.fillPos === "mid") k = syms.length;
    else{
      k = Math.min(2, syms.length);                 // 中间最多 2 个，看起来才像个分隔符
      if(syms.length - k === 1) k = syms.length;    // 只剩 1 个的话别丢在行尾，一起塞中间
      if(syms.length <= 1) k = 0;                   // 就 1 个：放行尾，塞中间反而像打错字
    }
    return line.slice(0,pos) + syms.slice(0,k).join("") + line.slice(pos) +
           syms.slice(k).join("") + emos.join("") + tail;
  }

  /* ================= 单条对准 ================= */
  function alignLine(orig0, force){
    var orig = fixEmojiGlue(orig0);
    // 一排只用一种符号：先把这条里 - / = 统一（宽度不变），原文列仍显示你写的样子
    var line = orig;
    if(state.style==="mix" || state.style==="dash" || state.style==="eq"){
      line = unifySymbol(orig, fillCharFor(orig, state.style));
    }
    var cap=state.cap, w=lineWidth(line);
    // 行尾的表情码后面接的是下一条，下一条若以数字开头就会粘成 #32140 → 补个分隔符；实在补不下就撤掉这个表情
    var te = line.match(/#\d+$/);
    if(te){
      if(lineWidth(line) + W.dash <= cap + 0.01){
        var sc = fillCharFor(line, state.style);
        line += (sc && sc !== " " ? sc : "-");
      }else{
        line = line.slice(0, line.length - te[0].length);
      }
    }
    // 把原来补在行尾的那串 - / = 收回来，等会儿按"补在哪"重新分配（宽度不变）
    var carry = "", tm = line.match(/[-=]+$/);
    if(tm && hasInfo(line.slice(0, line.length - tm[0].length))){
      carry = tm[0];
      line = line.slice(0, line.length - carry.length);
    }
    var wc = lineWidth(carry), w0 = lineWidth(line);
    w = w0 + wc;
    if(w <= cap + 0.01){
      var txt = padWith(line, cap - w0 - wc, carry, line + carry, force);
      var nw = lineWidth(txt);
      return { src:orig, core:line + carry, text:txt, width:nw, orig:w,
               status: isSafe(nw) ? "safe" : "padded", over:0 };
    }
    // 超了：只删填充类（空格 / - / = / 表情），绝不删正文
    var s=line + carry, over=w-cap, guard=0;
    while(over > 0.01 && guard++ < 200){
      var ts=tokenize(s), hit=null;
      for(var i=ts.length-1;i>=0;i--){
        if(ts[i].type==="emoji"){ hit=ts[i]; break; }
        if(ts[i].type==="text" && /[ =\-]/.test(ts[i].text)){ hit=ts[i]; break; }
      }
      if(!hit) break;
      if(hit.type==="emoji"){ s = s.replace(hit.text, ""); over -= state.emojiW; }
      else {
        var pos=s.lastIndexOf(hit.text);
        if(pos<0) break;
        var body=hit.text, k=body.search(/[ =\-]/);
        if(k<0) break;
        s = s.slice(0,pos+k) + body.slice(k+1) + s.slice(pos+body.length);
        over -= W.dash;
      }
    }
    var nw2=lineWidth(s);
    if(nw2 <= cap + 0.01){
      var s2=s, c2="", t2m=s2.match(/[-=]+$/);
      if(t2m && hasInfo(s2.slice(0, s2.length - t2m[0].length))){
        c2 = t2m[0]; s2 = s2.slice(0, s2.length - c2.length);
      }
      var t2 = padWith(s2, cap - lineWidth(s2) - lineWidth(c2), c2, s, force);
      return { src:orig, core:s2 + c2, text:t2, width:lineWidth(t2), orig:w, status:"trimmed", over:0 };
    }
    return { src:orig, core:s, text:s, width:nw2, orig:w, status:"over", over:nw2-cap };
  }

  // 参考写法：先删填充，再从尾巴收字，最后补满
  function shrinkToFit(src){
    var s=src, g=0;
    while(lineWidth(s) > state.cap + 0.01 && g++ < 200){
      var i=Math.max(s.lastIndexOf("="), s.lastIndexOf("-"), s.lastIndexOf(" "));
      if(i<0) break;
      s = s.slice(0,i) + s.slice(i+1);
    }
    while(lineWidth(s) > state.cap + 0.01 && s.length>1) s = s.slice(0,-1);
    return padWith(s, state.cap - lineWidth(s));
  }

  /* ================= 整段自动拆条 ================= */
  // 过长的一段，按行宽切成几条；优先断在 - = 空格 #32 之后（那通常就是原本的分条点）
  function splitAtoms(group){
    var atoms=[];
    tokenize(group).forEach(function(t){
      if(t.type==="emoji" || t.type==="fmt"){
        atoms.push({text:t.text, w:t.width, fill:(t.type==="emoji")});
      }else{
        Array.from(t.text).forEach(function(ch){
          atoms.push({text:ch, w:pxOf(ch), fill:/[ =\-]/.test(ch)});
        });
      }
    });
    return atoms;
  }
  function isWordChar(a){ return !!a && a.text.length===1 && /[0-9A-Za-z.]/.test(a.text); }
  var lastHardCuts = 0;              // 这次拆条有几处是"硬切"（把一个词劈开了）
  function autoSplit(group){
    var atoms = splitAtoms(group), out=[], i=0;
    while(i < atoms.length){
      var j=i, w=0;
      while(j<atoms.length && w + atoms[j].w <= state.cap + 0.01){ w += atoms[j].w; j++; }
      if(j >= atoms.length){ out.push(atoms.slice(i).map(function(a){return a.text;}).join("")); break; }

      // ① 下一个字是数字（典型的 55W 这种价格）：只差一点点就把尾部多余的填充符号丢掉，别把价格整条挤到下一行
      //    只丢掉"刚好放得下"的那么多，能留几个减号就留几个
      if(j === i){ j = i+1; }                                  // 单个字符就比一行宽（异常）
      else if(isWordChar(atoms[j-1]) && isWordChar(atoms[j])){
        // 切在两个字母数字之间：只有把"词"劈开了才要退回去
        // 但如果前一个字正好是 W / 万（价格单位），说明 55W 已经写完整了，这里就是两条广告的边界，可以切
        if(!/[Ww万]$/.test(atoms[j-1].text)){
          var k2=j;
          while(k2>i+1 && isWordChar(atoms[k2-1])) k2--;
          if(k2>i) j=k2;
        }
      }else if(!atoms[j-1].fill){
        // 往回收一段，找一个"填充字符之后"的断点（那通常就是原本的分条点），宁可多条减号也不切断词语
        var k=j, sum=0;
        while(k>i+1 && !atoms[k-1].fill) k--;
        if(k>i+1){
          for(var q3=i;q3<k;q3++) sum += atoms[q3].w;
          if(sum >= state.cap*0.5) j=k;
        }
      }
      // ② 切点落在两个中文字之间 = 这个词被劈开了，记一笔好提示用户「用空格分条」
      if(j<atoms.length && /[\u4e00-\u9fa5]/.test(atoms[j-1].text) && /[\u4e00-\u9fa5]/.test(atoms[j].text)) lastHardCuts++;
      out.push(atoms.slice(i,j).map(function(a){return a.text;}).join(""));
      i = j;
    }
    // 只含填充符号（如 =-= 、---）的碎片本身不是一条信息：去掉，否则游戏里会多出一行纯符号
    function hasContent(s){
      return s.replace(/#\d+/g,"").replace(/[ =\-]/g,"").trim() !== "";
    }
    out = out.filter(function(s){ return s.trim()!==""; });
    var contentful = out.filter(hasContent);
    if(contentful.length) out = contentful;   // 全段都是符号时保持原样，交给超宽提示，不吞掉内容
    return out;
  }

  /* ================= 分组 ================= */
  function splitGroups(line){ return line.split(/\s+/).filter(function(s){ return s!==""; }); }
  // 去掉颜色码、表情码、填充符号后还剩什么 —— 只剩这些的段不算一条信息
  function stripAll(g){
    return String(g).replace(new RegExp(FORMAT_RE.source,"g"), "")
                    .replace(/#\d+/g, "").replace(/[ =\-]/g, "").trim();
  }
  function hasInfo(g){ return stripAll(g) !== ""; }
  var lastDropped = 0;               // 这次被丢掉几个"塞不下的纯表情/符号碎片"
  function currentGroups(){
    var raw=$("input").value.replace(/\r/g,""), out=[];
    lastDropped = 0;
    lastHardCuts = 0;
    raw.split("\n").forEach(function(l){
      var segs=[];
      splitGroups(l).forEach(function(g){
        // 只有"明显是一整段"（超过 1.5 行）才自动拆；只超一点点的留给你自己微调
        if(state.autoSplit && lineWidth(g) > state.cap * 1.5){
          autoSplit(g).forEach(function(p){ segs.push(p); });
        }else{
          segs.push(g);
        }
      });
      var gl=[];
      for(var j=0; j<segs.length; ){
        var g=segs[j];
        if(!hasInfo(g)){
          // ① 段里的颜色码是 0 宽的，本来给后面的字上色 → 贴到下一条开头去
          var codes=(g.match(new RegExp(FORMAT_RE.source,"g"))||[]).join("");
          var body=String(g).replace(new RegExp(FORMAT_RE.source,"g"),"");
          if(codes && segs[j+1]!==undefined){
            segs[j+1]=codes+segs[j+1];
            if(body===""){ segs.splice(j,1); continue; }
            segs[j]=body; continue;
          }
          // ② 纯表情/符号：先并到上一条末尾，再试着贴到下一条开头
          var prev=gl[gl.length-1];
          if(prev!==undefined && lineWidth(prev+g)<=state.cap+0.01){ gl[gl.length-1]=prev+g; segs.splice(j,1); continue; }
          var nxt=segs[j+1];
          if(nxt!==undefined && lineWidth(g+nxt)<=state.cap+0.01){ segs[j+1]=g+nxt; segs.splice(j,1); continue; }
          // ③ 塞哪都会撑爆 → 丢掉，否则它会白占一整行、被补成一排符号
          lastDropped++; segs.splice(j,1); continue;
        }
        gl.push(g); segs.splice(j,1);
      }
      gl.forEach(function(g){ out.push(g); });
    });
    return out;
  }

  /* ================= 折行模拟 ================= */
  function chunkTokens(tokens, cap){
    var rows=[], cur=[], used=0, pending=[];
    function flush(){ if(cur.length){ rows.push({tokens:cur, width:used}); cur=[]; used=0; } }
    // 颜色码不占宽，但要"跟着下一个字符走"：换行时不能把它留在上一行末尾
    function place(t){
      if(pending.length){ for(var k=0;k<pending.length;k++) cur.push(pending[k]); pending=[]; }
      cur.push(t);
    }
    tokens.forEach(function(t){
      if(t.type==="fmt"){ pending.push(t); return; }
      if(t.type==="emoji"){
        if(used + t.width > cap + 0.01) flush();
        place(t); used += t.width;
        return;
      }
      var chars = Array.from(t.text), i=0;
      while(i < chars.length){
        var cw = pxOf(chars[i]);
        if(used + cw > cap + 0.01) flush();
        var room = cap - used, piece="", acc=0;
        while(i < chars.length){
          var c2 = pxOf(chars[i]);
          if(acc + c2 > room + 0.01) break;
          piece += chars[i]; acc += c2; i++;
        }
        if(piece){ place({type:"text", text:piece, width:acc}); used += acc; }
        else { place({type:"text", text:chars[i], width:cw}); used += cw; i++; }
      }
    });
    // 收尾：还剩颜色码就挂到已有行的末尾，绝不凭空造出一个 0 宽的空行
    if(pending.length){
      var host = cur.length ? cur : (rows.length ? rows[rows.length-1].tokens : null);
      if(host){ for(var q=0;q<pending.length;q++) host.push(pending[q]); }
      else { rows.push({tokens:pending.slice(), width:0}); }   // 整段只有颜色码时也别丢
      pending = [];
    }
    flush();
    return rows;
  }

  function spillText(it){
    var segs = chunkTokens(tokenize(it.text), state.cap), out="";
    for(var k=1;k<segs.length;k++){
      out += segs[k].tokens.map(function(t){ return t.type==="emoji" ? state.emojiFace : t.text; }).join("");
    }
    return out;
  }

  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function escAttr(s){ return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  /* ================= 算钱：一排一行，名字就从这一排里贴过来 ================= */
  // 不再跨排猜「哪个价钱配哪个名字」：每一排（= 对准后的那一条）自己成一行，
  // 名字取这排的文字，价钱取这排最后一个数字（自动填好，可以改），数量自己填。
  function cleanName(s){
    s = String(s).replace(/[-=_~·•]+/g, " ").replace(/\s+/g, " ").trim();
    s = s.replace(/^[收售出卖求]\s*/, "");          // 开头的「收」是动词，不是名字
    return s.replace(/^[\s\-=]+|[\s\-=]+$/g, "").trim();
  }
  function splitNamePrice(line){
    var s = String(line)
      .replace(/#[A-Za-z][0-9A-Fa-f]{6}|#[A-Za-z]/g, "")   // 颜色码：0 宽，不算内容
      .replace(/#\d+/g, " ")                                // 表情 #32
      .replace(/[ \t]+/g, " ");
    var m, last=null, re=/(\d+(?:\.\d+)?)\s*[wW](?![A-Za-z])/g;
    while((m = re.exec(s)) !== null) last = { i:m.index, end:m.index+m[0].length, v:parseFloat(m[1]) };
    if(!last){                        // 没写 W：认结尾那个裸数字（垃圾玉魄100 / 大丸子73）
      var mb = /(\d+(?:\.\d+)?)\s*[-=]*\s*$/.exec(s);
      if(mb) last = { i:mb.index, end:mb.index+mb[0].length, v:parseFloat(mb[1]) };
    }
    if(!last) return { name:cleanName(s), price:null };
    var name = cleanName(s.slice(0, last.i));
    if(!name) name = cleanName(s.slice(last.end));     // 价钱写在前头：10W收死亡幽灵
    return { name:name, price:(last.v > 0 ? last.v : null) };
  }
  function fmtNum(v){
    var r = Math.round(v*100)/100;
    var s = r.toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1");
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  var calcItems = [];
  var CALC_TIP_DEFAULT = "价钱是从每排最后一个数字自动认的，认错直接在框里改；数量随便填，合计自动算。";
  function priceOf(it){
    var p = state.price[it.key];
    if(p === undefined) p = (it.autoPrice === null ? 0 : it.autoPrice);
    return p;
  }
  function qtyOf(key){
    return (state.qty[key] === undefined ? 1 : state.qty[key]);
  }
  function calcTipHTML(){
    var noP = calcItems.filter(function(it){ return it.autoPrice === null; });
    if(noP.length){
      return '<span style="color:var(--gold)">有 '+noP.length+' 排没认出价钱（'+
        noP.slice(0,3).map(function(it){ return esc(it.name); }).join('、')+
        (noP.length>3?'…':'')+'），在单价框里自己填一下就行。</span>';
    }
    return CALC_TIP_DEFAULT;
  }
  function resetCalcTip(){
    var tip=$("calcTip"); if(!tip) return;
    tip.innerHTML = calcItems.length ? calcTipHTML() : ""; tip.style.color = "";
  }
  function renderCalc(){
    var seen = {};
    calcItems = items.map(function(it, i){
      var sp = splitNamePrice(it.src);
      var nm = sp.name || ("第" + (i+1) + "排");
      var k = (seen[nm] = (seen[nm]||0) + 1);
      return { idx:i+1, name:nm, autoPrice:sp.price, key:nm + "@" + k };
    });
    var body=$("calcBody"), none=$("calcNone"), tbl=$("calcTable"), sum=$("calcSum");
    if(!calcItems.length){
      body.innerHTML = "";
      if(tbl) tbl.style.display = "none";
      if(sum) sum.style.display = "none";
      none.style.display = "";
      resetCalcTip();
      updateTotals();
      return;
    }
    if(tbl) tbl.style.display = "";
    if(sum) sum.style.display = "";
    none.style.display = "none";
    var h="";
    calcItems.forEach(function(it){
      var q=qtyOf(it.key);
      var shown = (state.price[it.key] !== undefined)
        ? state.price[it.key]
        : (it.autoPrice === null ? "" : it.autoPrice);
      h += '<tr data-key="'+escAttr(it.key)+'"'+(q>0?"":' class="zero"')+'>'+
             '<td class="c-idx">'+it.idx+'</td>'+
             '<td class="c-name">'+esc(it.name)+'</td>'+
             '<td><input class="pin" type="number" min="0" step="0.5" value="'+shown+'"'+
               (state.price[it.key]===undefined && it.autoPrice!==null ? ' data-auto="1"' : '')+
               ' placeholder="填价" data-key="'+escAttr(it.key)+'"/></td>'+
             '<td><input class="qty" type="number" min="0" step="1" value="'+q+'" data-key="'+escAttr(it.key)+'"/></td>'+
             '<td class="c-sum">'+fmtNum(priceOf(it)*q)+' 万</td>'+
           '</tr>';
    });
    body.innerHTML = h;
    resetCalcTip();
    updateTotals();
  }
  function updateTotals(){
    var total=0, cnt=0, kinds=0;
    calcItems.forEach(function(it){
      var q=qtyOf(it.key), p=priceOf(it);
      total += p*q;
      cnt += q;
      if(q>0 && p>0) kinds++;
    });
    $("calcTotal").textContent = fmtNum(total) + " 万";
    $("calcYi").textContent = total >= 10000 ? "≈ " + fmtNum(total/10000) + " 亿" : "";
    $("calcSub").textContent = calcItems.length
      ? "共 "+calcItems.length+" 排"+(kinds? " · 有价 "+kinds+" 排 · "+fmtNum(cnt)+" 件" : " · 数量全是 0")
      : "";
  }

  /* ================= 主流程 ================= */
  var items=[];
  function compute(){
    var raw = $("input").value.replace(/\r/g,"");
    var lines = raw.split("\n").filter(function(l){ return l.trim()!==""; });

    items = currentGroups().map(alignLine);
    // 最后一条后面没内容了，不必补满——补了只是一串多余符号
    if(items.length){
      var li = items.length-1;
      if(items[li].status !== "over"){
        items[li] = Object.assign({}, items[li], { text:items[li].core, status:"end", width:lineWidth(items[li].core) });
      }
    }

    var h="", overCount=0;
    items.forEach(function(it,i){
      if(it.status==="over") overCount++;
      var badge;
      if(it.status==="over"){
        badge = '<span class="badge b-over">多 '+fmtW(it.width-state.cap)+'px</span>';
      }else if(it.status==="trimmed"){
        badge = '<span class="badge b-fill">删了多余填充</span>';
      }else if(it.status==="safe"){
        badge = '<span class="badge b-ok">已占满</span>';
      }else if(it.status==="end"){
        badge = '<span class="badge b-ok">末条·不用补</span>';
      }else if(state.cap - it.orig > THIN){
        badge = '<span class="badge b-thin">太空 · 补 '+fmtW(state.cap-it.orig)+'px</span>';
      }else{
        badge = '<span class="badge b-fill">补 '+fmtW(state.cap-it.orig)+'px</span>';
      }
      var tail="";
      if(it.status==="over"){
        tail = '<div class="sub" style="color:var(--err);margin-top:3px">'+fmtW(it.width)+'px &gt; '+state.cap+'px，会被拆成两行 · 见上方清单</div>';
      }else if(it.status==="trimmed"){
        tail = '<div class="sub" style="margin-top:3px;color:var(--blue)">自动删掉了多余的 = / - / 空格 / 表情</div>';
      }else if(state.cap - it.orig > THIN && it.status!=="end"){
        tail = '<div class="sub" style="margin-top:3px;color:#b45309">这段只有 '+fmtW(it.orig)+'px，得补 '+fmtW(state.cap-it.orig)+'px 符号才能占满一行</div>';
      }
      h += '<tr><td class="idx">'+(i+1)+'</td>'+
           '<td><span class="mono">'+esc(it.src)+'</span></td>'+
           '<td>'+badge+'<div class="sub">'+fmtW(it.orig)+'/'+state.cap+'px</div></td>'+
           '<td><span class="mono">'+esc(it.text)+'</span>'+tail+'</td></tr>';
    });

    $("entries").innerHTML = h || '<tr><td colspan="4" style="color:var(--sub)">先输入几条信息 ↑</td></tr>';
    var hardTip = lastHardCuts
      ? '<div style="color:var(--gold);margin-top:5px">⚠ 有 '+lastHardCuts+' 处是按宽度硬切的（把一个词劈成了两半），因为这一段里没有空格/换行分隔。用<b>空格</b>把每条隔开，就不会切在词中间。</div>'
      : '';
    $("tableTip").innerHTML = (!lines.length ? ''
      : overCount
        ? '<span style="color:var(--err)">有 '+overCount+' 条本身超过一行，靠填充救不了：减字、或把它拆成两条。</span>'
        : '<span style="color:var(--ok)">'+items.length+' 条全部占满 ✓（每条 '+fmtW(state.cap-SAFE())+'~'+state.cap+'px，下一段第一个字符塞不进来，必然换行）</span>'
      ) + hardTip;

    // ---- 待微调清单 ----
    var over = items.filter(function(it){ return it.status==="over"; });
    var thin = items.filter(function(it){
      return it.status!=="over" && it.status!=="end" && (state.cap - it.orig) > THIN;
    });
    if(!lines.length){
      $("todo").innerHTML = "";
    }else if(!over.length && !thin.length){
      $("todo").innerHTML = '<div class="todo-ok">✓ 不用改，'+items.length+' 条都能各自占满一整行</div>';
    }else{
      var th = "";
      if(lastDropped){
        th += '<div class="todo-note" style="margin-bottom:9px">已忽略 '+lastDropped+
          ' 个单独占位的表情/符号（它塞不进任何一条里，留着只会白占一整行、被补成一排符号）。</div>';
      }
      if(thin.length){
        th += '<div class="todo-hd" style="color:#b45309">⚠ 下面 '+thin.length+' 条"太空了"——补出来那一大串符号就是它造成的：</div>';
        thin.forEach(function(it){
          var idx = items.indexOf(it);
          th += '<div class="todo-item" style="background:#fffaf0;border-color:#f0dcae">'+
            '<div class="todo-row">'+
              '<span class="todo-idx">第'+(idx+1)+'条</span>'+
              '<span class="mono">'+esc(it.src)+'</span>'+
              '<span class="todo-bad" style="background:#fff3d6;color:#b45309">只有 '+fmtW(it.orig)+'px</span>'+
              '<span class="todo-note">要补 '+fmtW(state.cap-it.orig)+'px 才够一行，也就是十来个符号</span>'+
            '</div>'+
            '<div class="todo-note" style="margin-top:5px">多半是这句被空格切碎了（比如「140灵饰」和「380W」被分成两条）。'+
              '把这几个字连起来写成一条，或者直接删掉。</div>'+
            '<div class="todo-edit">'+
              '<button class="mini" data-join="'+idx+'">并到上一条</button>'+
            '</div>'+
          '</div>';
        });
      }
      if(over.length){
        th += '<div class="todo-hd">⚠ 下面 '+over.length+' 条比一行还宽，游戏一定会把它们劈开。自己写改法，或点「自动凑满」：</div>';
        over.forEach(function(it){
          var idx = items.indexOf(it), sug = shrinkToFit(it.src);
          th += '<div class="todo-item">'+
            '<div class="todo-row">'+
              '<span class="todo-idx">第'+(idx+1)+'条</span>'+
              '<span class="mono">'+esc(it.src)+'</span>'+
              '<span class="todo-bad">多 '+fmtW(it.width-state.cap)+'px</span>'+
              '<span class="todo-note">会甩到下一行：「'+esc(spillText(it))+'」</span>'+
            '</div>'+
            '<div class="todo-edit">'+
              '<span class="lbl">改成</span>'+
              '<input class="fixin mono" data-idx="'+idx+'" value="'+escAttr(it.src)+'" />'+
              '<span class="wtag" data-w="'+idx+'"></span>'+
              '<button class="mini ghost" data-auto="'+idx+'">自动凑满</button>'+
              '<button class="mini" data-use="'+idx+'">采用</button>'+
            '</div>'+
            '<div class="todo-note" style="margin-top:5px">参考：'+esc(sug)+'</div>'+
          '</div>';
        });
        th += '<button class="btn blue" id="fixAllBtn">全部采用</button>';
      }
      $("todo").innerHTML = th;
      bindTodo();
    }

    $("resultText").value = items.map(function(it){ return it.text; }).join("");
    renderCalc();
  }

  function oneMap(idx, val){ var m={}; m[idx]=val; return m; }

  function updateWTag(idx, val){
    var box=$("todo"); if(!box || !box.querySelector) return;
    var el=box.querySelector('.wtag[data-w="'+idx+'"]'); if(!el) return;
    var w=lineWidth(val);
    var st = w>state.cap ? 'bad' : (isSafe(w) ? 'good' : 'mid');
    el.textContent = fmtW(w)+'/'+state.cap+'px' +
      (w>state.cap ? ' 多'+fmtW(w-state.cap) : (isSafe(w) ? ' ✓' : ' 还差'+fmtW(state.cap-w)));
    el.className = 'wtag '+st;
  }
  function bindTodo(){
    var box=$("todo"); if(!box || !box.querySelectorAll) return;
    Array.prototype.forEach.call(box.querySelectorAll("input[data-idx]"), function(inp){
      var idx=parseInt(inp.getAttribute("data-idx"),10);
      updateWTag(idx, inp.value);
      inp.addEventListener("input", function(){ updateWTag(idx, inp.value); });
      inp.addEventListener("keydown", function(e){ if(e.key==="Enter"){ applyFixes(oneMap(idx, inp.value)); } });
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-auto]"), function(b){
      b.addEventListener("click", function(){
        var idx=parseInt(b.getAttribute("data-auto"),10);
        var inp=box.querySelector('input[data-idx="'+idx+'"]'); if(!inp) return;
        inp.value = shrinkToFit(inp.value);
        updateWTag(idx, inp.value);
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-use]"), function(b){
      b.addEventListener("click", function(){
        var idx=parseInt(b.getAttribute("data-use"),10);
        var inp=box.querySelector('input[data-idx="'+idx+'"]'); if(!inp) return;
        applyFixes(oneMap(idx, inp.value));
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-join]"), function(b){
      b.addEventListener("click", function(){
        joinToPrev(parseInt(b.getAttribute("data-join"),10));
      });
    });
    var allBtn = box.querySelector("#fixAllBtn");
    if(allBtn){
      allBtn.addEventListener("click", function(){
        var map={};
        Array.prototype.forEach.call(box.querySelectorAll("input[data-idx]"), function(inp){
          map[parseInt(inp.getAttribute("data-idx"),10)] = inp.value;
        });
        applyFixes(map);
      });
    }
  }

  // 把改法写回输入框（但拆过条的场合按"条"替换更可靠：先还原成一条一条）
  function applyFixes(map){
    var groups = currentGroups(), out=[];
    groups.forEach(function(g,i){
      out.push((map[i]!==undefined && String(map[i])!=="") ? map[i] : g);
    });
    $("input").value = out.join("\n");
    compute();
  }

  // 把第 idx 条并到上一条末尾（"太空"的碎片多半就该这样合回去）
  function joinToPrev(idx){
    var gs = currentGroups();
    if(idx<=0 || idx>=gs.length) return;
    gs[idx-1] = gs[idx-1] + gs[idx];
    gs.splice(idx,1);
    $("input").value = gs.join("\n");
    compute();
  }

  /* ================= 绑定 ================= */
  function bindStep(btn,inp,delta,key,apply){
    $(btn).addEventListener("click",function(){
      var el=$(inp), v=(parseFloat(el.value)||0)+delta;
      v = Math.max(parseFloat(el.min), Math.min(parseFloat(el.max), v));
      el.value = v; state[key] = v; if(apply) apply(); compute();
    });
    $(inp).addEventListener("input",function(){
      var v=parseFloat(this.value); if(isNaN(v)) return;
      var lo=parseFloat(this.min), hi=parseFloat(this.max);
      if(isNaN(lo)) lo=0; if(isNaN(hi)) hi=200;          // min="0" 时不能用 || 兜底（0 会被当假值抬成 1）
      state[key] = Math.max(lo, Math.min(hi, v)); if(apply) apply();
      if(String(state[key]) !== this.value) this.value = state[key];   // 越界时把显示也拉回合法值
      compute();
    });
  }
  bindStep("maxEmoMinus","maxEmoji",-1,"maxEmoji");
  bindStep("maxEmoPlus","maxEmoji",1,"maxEmoji");

  // 高级里的两个数（没有 ± 按钮，直接输入）
  [["capacity","cap"],["emoWidth","emojiW"]].forEach(function(p){
    var el=$(p[0]); if(!el) return;
    el.addEventListener("input", function(){
      var v=parseFloat(this.value); if(isNaN(v)) return;
      var lo=parseFloat(this.min)||1, hi=parseFloat(this.max)||200;
      state[p[1]] = Math.max(lo, Math.min(hi, v));
      if(String(state[p[1]]) !== this.value) this.value = state[p[1]];
      compute();
    });
  });

  [["wCn","cn"],["wDigit","digit"],["wDash","dash"],["wUpper","upperW"],["wUpper2","upper"],["wLower","lower"]]
  .forEach(function(p){
    var el=$(p[0]);
    if(el) el.addEventListener("input", function(){
      var v=parseFloat(this.value); if(!isNaN(v) && v>0) W[p[1]]=v;
      compute();
    });
  });

  $("input").addEventListener("input",function(){
    var v = this.value;
    var runs = (v.match(/(?:#\d+[ ]*){2,}/g) || []).length;
    var glue = (v.match(/#\d{4,}/g) || []);
    $("inputTip").innerHTML = glue.length
      ? '<span style="color:var(--gold)">检测到 '+glue.length+' 处 <b>'+glue[0]+'</b> 这种写法：表情码和数字粘在一起，游戏会把 <b>#32140</b> 当成不存在的表情、把数字吞掉。已按 <b>#32</b> + 数字 分开计算，成品里会自动加 <b>-</b> 隔开。</span>'
      : (runs
        ? '<span style="color:var(--err)">检测到 '+runs+' 处连排表情（通常是以前填充留下的），建议点「🧹 连排表情压成 1 个」。</span>'
        : '<span style="color:var(--sub)">回车换下一条；同一条里想连着写就直接连。用 <b>空格</b> 隔开的每一段会各算一条。</span>');
    compute();
  });
  $("autoSplit").addEventListener("change",function(){
    state.autoSplit = this.checked; compute();
  });

  $("demoBtn").addEventListener("click",function(){
    var raw = "#Y10W收死亡幽灵4级老家具20W-图纸也来#32#32-收60灵饰=55W-80灵饰--85W--120灵饰--250W140灵饰--380W垃圾玉魄100W-#32#32#32#32#32#32-小丸子=14.5W-大丸子73W#32#32神兽诞145W=-=";
    $("input").value = raw.replace(/(?:#\d+[ ]*){2,}/g, "#32");   // 示例里先把连排表情压掉，避免一上手就是一堆表情
    $("inputTip").innerHTML = '<span style="color:var(--sub)">这是你上次发的那一整段（已把连排表情压成 1 个）。勾着「自动拆条」时，工具会在 - = #32 处把它拆成一条一条，再各自补满。</span>';
    compute();
  });
  $("clearBtn").addEventListener("click",function(){ $("input").value=""; compute(); });

  $("alignBtn").addEventListener("click",function(){
    // 仍然超宽的那条保持原样：不替用户删他写的符号，只把能自动搞定的写好
    $("input").value = currentGroups().map(function(g){
      var r = alignLine(g, true);
      return r.status==="over" ? g : r.text;
    }).join("\n");
    compute();
  });

  // 连排表情（2 个以上 #32 紧挨着）压成 1 个——这些通常是以前填充留下来的，视觉上很挤
  $("cleanEmoBtn").addEventListener("click",function(){
    var v=$("input").value;
    $("input").value = v.replace(/(?:#\d+[ ]*){2,}/g, "#32");
    $("inputTip").innerHTML = '<span style="color:var(--sub)">已把连续 2 个以上的表情压成 1 个，其余内容没动。</span>';
    compute();
  });

  // 删掉文本里所有表情码（#32 / #100 这种 #+数字）；颜色码 #Y、#c008000 是格式，不动
  $("stripEmoBtn").addEventListener("click",function(){
    var v = $("input").value;
    if(!v){ $("inputTip").innerHTML = '<span style="color:var(--sub)">输入框是空的。</span>'; return; }
    // #32140 是 #32 和 140 粘住了：先把数字救回来，别连 140 一起删
    var out = v.replace(/#(\d{2})(\d{2,})/g, "$2");
    var cnt = (v.match(/#\d+/g)||[]).length;
    if(cnt){
      out = out.replace(/#\d+/g, "")
             .replace(/[ \t]{2,}/g, " ")
             .replace(/^[ \t]+|[ \t]+$/gm, "");
      $("input").value = out;
    }
    $("inputTip").innerHTML = cnt
      ? '<span style="color:var(--sub)">已删掉 <b>'+cnt+'</b> 个表情码（#+数字）。颜色码 #Y 之类没动，正文一个字没改；顺手压掉了多出来的空格。'+
        '不想让对准时又补表情，把上面「表情上限」设成 0。</span>'
      : '<span style="color:var(--sub)">没找到表情码（#+数字），内容没动。</span>';
    compute();
  });

  Array.prototype.forEach.call(document.querySelectorAll(".style-opt"),function(o){
    o.addEventListener("click",function(){
      Array.prototype.forEach.call(document.querySelectorAll(".style-opt"),function(x){ x.classList.remove("on"); });
      o.classList.add("on"); state.style = o.getAttribute("data-style");
      $("customRow").classList.toggle("show", state.style==="custom"); compute();
    });
  });
  $("customFill").addEventListener("input",function(){ state.customFill=this.value; compute(); });

  Array.prototype.forEach.call(document.querySelectorAll(".pos-opt"),function(o){
    o.addEventListener("click",function(){
      Array.prototype.forEach.call(document.querySelectorAll(".pos-opt"),function(x){ x.classList.remove("on"); });
      o.classList.add("on"); state.fillPos = o.getAttribute("data-pos"); compute();
    });
  });

  $("copyBtn").addEventListener("click",function(){
    var text=$("resultText").value, tip=$("copyTip");
    if(!text){
      tip.textContent="成品还是空的，先输入几条信息"; tip.style.color="var(--err)";
      setTimeout(function(){ tip.textContent="没换行符，游戏会自己折行"; tip.style.color=""; },2000);
      return;
    }
    function done(){
      tip.textContent="✅ 已复制，粘到游戏对话框"; tip.style.color="var(--ok)";
      setTimeout(function(){ tip.textContent="没换行符，游戏会自己折行"; tip.style.color=""; },2500);
    }
    function fb(){ var ta=$("resultText"); ta.select(); try{ document.execCommand("copy"); done(); }catch(e){} }
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fb);
    else fb();
  });

  /* ---------- 算钱：数量与合计 ---------- */
  function setAllQty(v){
    calcItems.forEach(function(it){ state.qty[it.key] = v; });
    renderCalc();
  }
  $("qtyZeroBtn").addEventListener("click", function(){ setAllQty(0); });
  $("qtyOneBtn").addEventListener("click", function(){ setAllQty(1); });

  $("calcBody").addEventListener("input", function(e){
    var t = e.target;
    if(!t || !t.getAttribute) return;
    var key = t.getAttribute("data-key"); if(!key) return;
    var v = parseFloat(t.value);
    if(isNaN(v) || v < 0) v = 0;
    var isPrice = /(^|\s)pin(\s|$)/.test(t.className || "");
    if(isPrice) state.price[key] = v; else state.qty[key] = v;
    var it = null;
    for(var i=0;i<calcItems.length;i++){ if(calcItems[i].key === key){ it = calcItems[i]; break; } }
    var tr = t.parentNode && t.parentNode.parentNode;
    if(it && tr){
      var cell = tr.querySelector ? tr.querySelector(".c-sum") : null;
      if(cell) cell.textContent = fmtNum(priceOf(it) * qtyOf(it)) + " 万";
      if(tr.classList) tr.classList.toggle("zero", !(qtyOf(it) > 0));
    }
    updateTotals();
  });

  $("calcCopyBtn").addEventListener("click", function(){
    var tip=$("calcTip");
    function say(msg,color){
      tip.textContent = msg; tip.style.color = color || "";
      setTimeout(resetCalcTip, 2500);
    }
    if(!calcItems.length){ say("上面还没有可算的排", "var(--err)"); return; }
    var total=0, txt=[];
    calcItems.forEach(function(it){
      var q=qtyOf(it.key), p=priceOf(it);
      total += p*q;
      txt.push(it.idx+". "+it.name+"  "+(p>0?fmtNum(p)+"万":"未填价")+" × "+fmtNum(q)+" = "+fmtNum(p*q)+"万");
    });
    txt.push("合计 " + fmtNum(total) + " 万");
    var s = txt.join("\n");
    function done(){ say("✅ 已复制清单", "var(--ok)"); }
    function fb(){
      var ta=$("resultText"), old=ta.value;
      ta.value=s; ta.select();
      try{ document.execCommand("copy"); done(); }catch(e){ say("复制失败，可以手动选中表格","var(--err)"); }
      ta.value=old;
    }
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(done, fb);
    else fb();
  });

  compute();
})();
