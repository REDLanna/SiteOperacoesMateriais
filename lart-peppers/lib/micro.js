// lib/micro.js — Mini framework HTTP usando apenas Node.js built-ins
'use strict';

const http   = require('node:http');
const path   = require('node:path');
const fs     = require('node:fs');
const url    = require('node:url');
const crypto = require('node:crypto');

const MIME = {
  '.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff'
};

// ── SESSION (in-memory) ───────────────────────────────────────────────────
const sessions = new Map();
function genSid() { return crypto.randomBytes(24).toString('hex'); }
function getSession(req) {
  const m = (req.headers.cookie||'').match(/lart_sid=([a-f0-9]+)/);
  const sid = m ? m[1] : null;
  if (sid && sessions.has(sid)) return { id:sid, data:sessions.get(sid), isNew:false };
  const newSid = genSid();
  sessions.set(newSid, {});
  return { id:newSid, data:sessions.get(newSid), isNew:true };
}

// ── ROUTER ────────────────────────────────────────────────────────────────
class Router {
  constructor() { this.routes = []; }
  get(p,...fns)    { this._add('GET',p,fns); }
  post(p,...fns)   { this._add('POST',p,fns); }
  patch(p,...fns)  { this._add('PATCH',p,fns); }
  delete(p,...fns) { this._add('DELETE',p,fns); }
  _add(method,rp,fns){
    const keys=[];
    const re=new RegExp('^'+rp.replace(/:([^/]+)/g,(_,k)=>{keys.push(k);return'([^/]+)'})+'/?$');
    this.routes.push({method,re,keys,fns});
  }
  async handle(req,res){
    const route=this.routes.find(r=>r.method===req.method&&r.re.test(req._path));
    if(!route) return false;
    const m=req._path.match(route.re);
    req.params={};
    route.keys.forEach((k,i)=>{req.params[k]=decodeURIComponent(m[i+1]);});
    let i=0;
    const next=()=>{ if(route.fns[++i]) route.fns[i](req,res,next); };
    await route.fns[0](req,res,next);
    return true;
  }
}

// ── APP ───────────────────────────────────────────────────────────────────
class App {
  constructor(){ this.router=new Router(); this.subs=[]; this.staticDir=null; }
  use(pOrFn, sub){
    if(typeof pOrFn==='string'&&sub) this.subs.push({prefix:pOrFn,router:sub});
  }
  setStatic(dir){ this.staticDir=dir; }
  get(p,...fns)    { this.router.get(p,...fns); }
  post(p,...fns)   { this.router.post(p,...fns); }
  patch(p,...fns)  { this.router.patch(p,...fns); }
  delete(p,...fns) { this.router.delete(p,...fns); }

  listen(port,cb){
    const server=http.createServer(async(rawReq,rawRes)=>{
      try{ await this._handle(rawReq,rawRes); }
      catch(e){
        console.error('[500]',e.stack);
        if(!rawRes.headersSent){
          rawRes.writeHead(500,{'Content-Type':'application/json'});
          rawRes.end(JSON.stringify({success:false,error:'Erro interno.'}));
        }
      }
    });
    server.listen(port,cb);
    return server;
  }

  async _handle(req,res){
    const p=url.parse(req.url,true);
    req._path=p.pathname;
    req.query=p.query;

    // session
    const sess=getSession(req);
    req.session=sess.data;
    req.session.destroy=()=>{ sessions.delete(sess.id); };
    req._sid=sess.id;

    // response helpers
    res.json=(obj,status=200)=>{
      if(res.headersSent) return;
      const body=JSON.stringify(obj);
      const hdrs={'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)};
      if(sess.isNew||res._writeSid)
        hdrs['Set-Cookie']=`lart_sid=${req._sid}; HttpOnly; Path=/; Max-Age=86400`;
      res.writeHead(status,hdrs); res.end(body);
    };
    res._writeSid=false;
    res.sendFile=(fp)=>{
      if(res.headersSent) return;
      fs.readFile(fp,(err,data)=>{
        if(err){res.writeHead(404);res.end('Not found');return;}
        const ext=path.extname(fp);
        res.writeHead(res._sc||200,{'Content-Type':MIME[ext]||'text/plain','Content-Length':data.length});
        res.end(data);
      });
    };
    res.status=(s)=>{res._sc=s;return res;};

    // parse body
    if(['POST','PATCH','PUT'].includes(req.method)){
      await new Promise(ok=>{
        let d='';
        req.on('data',c=>{d+=c;if(d.length>2e6)req.destroy();});
        req.on('end',()=>{
          const ct=req.headers['content-type']||'';
          try{
            req.body=ct.includes('json')?JSON.parse(d||'{}'):
              ct.includes('urlencoded')?Object.fromEntries(new url.URLSearchParams(d)):{};
          }catch{req.body={};}
          ok();
        });
        req.on('error',()=>{req.body={};ok();});
      });
    } else { req.body={}; }

    // static
    if(this.staticDir&&!req._path.startsWith('/api/')){
      if(await this._static(req,res)) return;
    }

    // sub-routers
    for(const {prefix,router} of this.subs){
      if(req._path.startsWith(prefix)){
        const orig=req._path;
        req._path=req._path.slice(prefix.length)||'/';
        const ok=await router.handle(req,res);
        req._path=orig;
        if(ok) return;
      }
    }

    // main
    const ok=await this.router.handle(req,res);
    if(!ok){
      if(req._path.startsWith('/api/')){
        res.writeHead(404,{'Content-Type':'application/json'});
        res.end(JSON.stringify({success:false,error:'Rota não encontrada.'}));
      } else {
        // SPA fallback
        const idx=path.join(this.staticDir,'index.html');
        res.sendFile(idx);
      }
    }
  }

  async _static(req,res){
    if(req.method!=='GET') return false;
    let fp=path.join(this.staticDir,req._path);
    if(!fp.startsWith(this.staticDir)) return false;
    try{
      const st=fs.statSync(fp);
      if(st.isDirectory()) fp=path.join(fp,'index.html');
    }catch{return false;}
    try{
      const data=fs.readFileSync(fp);
      const ext=path.extname(fp);
      res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':data.length});
      res.end(data);
      return true;
    }catch{return false;}
  }
}

function createApp()    { return new App(); }
function createRouter() { return new Router(); }
module.exports = { createApp, createRouter };
