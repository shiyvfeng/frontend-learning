import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createKeyboardNavigator } from './keyboard-navigation.js';
import { TOOL01_STORAGE as KEY, tool01Initial, tool01Check, tool01Phases, tool01Preparation, tool01Brief, tool01Questions, tool01Models } from '../src/tool-one-content.js';
const out='/tmp/tool01-acceptance'; mkdirSync(out,{recursive:true});
const axe=readFileSync('node_modules/axe-core/axe.min.js','utf8');
const b=(p,n)=>p.getByRole('button',{name:n,exact:true});
const model=(p,id)=>b(p,tool01Models.find(x=>x.id===id).label);
const st=(p,i)=>p.getByRole('navigation',{name:'T01工具专题学习步骤'}).getByRole('button').nth(i);
const delivery=p=>p.getByRole('button',{name:/^投递最早模拟结果/});
const run=p=>p.locator('.tool01-workbench').getAttribute('data-run').then(JSON.parse);
const queue=p=>p.locator('.tool01-workbench').getAttribute('data-queue').then(JSON.parse);
const read=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
const choose=(p,id,v)=>p.locator('#tool01-'+id).selectOption(v);
const feedback=p=>p.locator('.tool01-feedback');
const draft=p=>p.locator('#tool01-agent-draft');
const priors=[...Array.from({length:32},(_,i)=>`frontend-observatory.lesson${i+1}.v1`),'frontend-observatory.stageA.v1','frontend-observatory.stageB.v1'];
async function directory(p,act=l=>l.click()) {
 const nav=p.getByRole('navigation',{name:'综合与工具模块'});
 if(!await nav.isVisible())await act(b(p,'☰ 课程'),'menu');
 await act(nav.getByRole('button',{name:'T01 · React / Next.js · 可学习',exact:true}),'T01');
 await expect(p.locator('#tool01-stage-heading')).toBeVisible();
}
async function open(p,i=0){await p.goto('/');await directory(p);if(i)await st(p,i).click();}
async function seed(p,d){await p.addInitScript(([k,d])=>localStorage.setItem(k,JSON.stringify(d)),[KEY,d]);}
async function drive(p,act=l=>l.click()){
 for(let i=0;i<25;i++) {const r=await run(p);if(r.status==='ready')return r;if(r.status==='waiting')await act(delivery(p),'deliver');else if(r.status==='running')await act(b(p,'继续下个模拟阶段'),'advance');else throw Error('Unexpected '+r.status);}
 throw Error('Model never ready');
}
async function start(p,act=l=>l.click()){await act(b(p,'开始模拟首访'),'start');return drive(p,act);}
async function waitPhase(p,act=l=>l.click()){
 for(let i=0;i<15;i++){const r=await run(p);if(r.status==='waiting')return r;expect(r.status).toBe('running');await act(b(p,'继续下个模拟阶段'),'advance to wait');}throw Error('no wait');
}
async function axeCheck(p){await p.evaluate(axe);expect(await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))).toEqual([]);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
const good=()=>({...tool01Initial(),done:[0,1,2,3],step:4,context:'现有React+Vite，静态托管，保留交互而不强制迁移。'});

test('explicit constraints admit multiple public solutions and distinguish request runtime, API and client boundary',()=>{
 for(const m of ['vite','export','request'])expect(tool01Check({...tool01Initial(),model:m,host:m==='request'?'runtime':'static'}).valid).toBe(true);
 expect(tool01Check({...tool01Initial(),model:'request'}).issues.map(i=>i.id)).toContain('runtime');
 expect(tool01Check({...tool01Initial(),dataSource:'request'}).issues.map(i=>i.id)).toContain('personal');
 expect(tool01Check({...tool01Initial(),dataSource:'api'}).issues.map(i=>i.id)).toContain('api');
 expect(tool01Check({...tool01Initial(),model:'export',controlSide:'server'}).issues.map(i=>i.id)).toContain('boundary');
 expect(tool01Check({...tool01Initial(),model:'export',controlSide:'server',interactive:false}).valid).toBe(true);
 expect(tool01Check({...tool01Initial(),dataSource:'api',host:'api'}).valid).toBe(true);
 const browserData={...tool01Initial(),model:'export',dataSource:'api',host:'api',interactive:false,controlSide:'server',contentSide:'server'};expect(tool01Check(browserData).issues.map(i=>i.id)).toContain('boundary');expect(tool01Check({...browserData,contentSide:'client'}).valid).toBe(true);
});
test('logical phases separate deployment build, RSC output, first HTML and hydration, not blanket React SSR claims',()=>{
 const d=tool01Initial();expect(tool01Preparation(d)).toContain('createRoot');
 expect(tool01Phases(d).map(p=>p.id)).not.toContain('hydrate');
 const e={...d,model:'export'};const ep=tool01Phases(e).map(p=>p.id);
 expect(ep.indexOf('display')).toBeLessThan(ep.indexOf('hydrate'));expect(tool01Preparation(e)).toContain('构建');
 const r=tool01Phases({...e,model:'request',dataSource:'request'}).map(p=>p.id);
 expect(r.indexOf('server-data')).toBeLessThan(r.indexOf('rsc'));expect(r.indexOf('rsc')).toBeLessThan(r.indexOf('html'));
 const s=tool01Phases({...e,controlSide:'server',interactive:false}).map(p=>p.id);expect(s).toContain('coordinate');
 expect(tool01Brief(d)).toContain('不是第35课');expect(tool01Brief(d)).toContain('未安装或运行Next服务器');
 const pkg=JSON.parse(readFileSync('package.json','utf8'));expect(pkg.dependencies.next).toBeUndefined();expect(readFileSync('index.html','utf8')).toContain('<div id="root"></div>');
 expect(readFileSync('src/main.jsx','utf8')).toContain('createRoot');
});
test('scenario selection retains model/host, explains conflicts and never claims production validation',async({page})=>{
 await open(page);await model(page,'request').click();await b(page,'核对需求、部署与边界').click();expect((await read(page)).constraintSeen).toBe(true);
 await choose(page,'host','runtime');await b(page,'核对需求、部署与边界').click();await expect(feedback(page)).toContainText('不是已验证');
 await choose(page,'scenario','member');expect(await read(page)).toMatchObject({model:'request',host:'runtime',dataSource:'request'});
 await choose(page,'control','server');await b(page,'核对需求、部署与边界').click();expect((await read(page)).boundaryErrorSeen).toBe(true);
 await model(page,'vite').click();await expect(page.locator('#tool01-control')).toHaveCount(0);await model(page,'export').click();await expect(page.locator('#tool01-control')).toHaveValue('server');
});
test('CSR has empty shell then real React control; counter is guarded before simulated readiness',async({page})=>{
 await open(page,1);await b(page,'体验真实React控件').click();await expect(page.locator('[data-real-count]')).toHaveText('0');
 await start(page);expect((await read(page)).csrComplete).toBe(true);await b(page,'体验真实React控件').click();await expect(page.locator('[data-real-count]')).toHaveText('1');await expect(feedback(page)).toContainText('不证明Next');
});
test('Next static first HTML appears before hydration including Client content subtree',async({page})=>{
 await open(page,1);await model(page,'export').click();await choose(page,'content','client');await b(page,'开始模拟首访').click();await b(page,'继续下个模拟阶段').click();
 expect(await run(page)).toMatchObject({status:'running',index:1});await expect(page.locator('.tool01-output')).toContainText('公开教学课程');expect((await read(page)).htmlBeforeHydrationSeen).toBe(true);
 await drive(page);expect((await read(page)).nextComplete).toBe(true);await expect(page.locator('.tool01-preparation')).toContainText('构建');
});
test('request personalized HTML awaits server sample and separates RSC from HTML render',async({page})=>{
 await open(page,2);await model(page,'request').click();await choose(page,'host','runtime');await choose(page,'scenario','member');await b(page,'开始模拟首访').click();await waitPhase(page);expect((await queue(page))[0].phase).toContain('数据');
 await drive(page);expect((await read(page)).requestComplete).toBe(true);await expect(page.locator('.tool01-output')).toContainText('虚构');
});
test('browser API model retains initial placeholder then accepts local sample after JS phase',async({page})=>{
 await open(page,1);await model(page,'export').click();await choose(page,'host','api');await choose(page,'data','api');await b(page,'开始模拟首访').click();await b(page,'继续下个模拟阶段').click();await expect(page.locator('.tool01-output')).toContainText('公开占位');
 await drive(page);await expect(page.locator('.tool01-output')).toContainText('API教学课程');await expect(page.locator('.tool01-output')).toContainText('未联网');
});
test('Server-only noninteractive model coordinates output without asserting zero framework JS',async({page})=>{
 await open(page,1);await model(page,'export').click();await page.getByRole('checkbox',{name:'需要客户端事件与本地状态',exact:true}).uncheck();await choose(page,'control','server');
 await start(page);await expect(page.locator('.tool01-timeline')).toContainText('不代表框架必定零JS');await b(page,'体验真实React控件').click();await expect(page.locator('[data-real-count]')).toHaveText('0');await expect(feedback(page)).toContainText('没有用户交互需求');
 await choose(page,'host','api');await choose(page,'data','api');await b(page,'开始模拟首访').click();expect((await run(page)).status).toBe('idle');await expect(feedback(page)).toContainText('不会自动承担业务API逻辑');await choose(page,'content','client');await start(page);await expect(page.locator('.tool01-output')).toContainText('API教学课程');
});
test('sealed failure stays failure, duplicate starts blocked, retry preserves readable result and real counter',async({page})=>{
 await open(page,2);await start(page);await b(page,'体验真实React控件').click();await choose(page,'result','error');await b(page,'开始模拟首访').click();const id=(await run(page)).id;await b(page,'开始模拟首访').dblclick();expect((await run(page)).id).toBe(id);
 await waitPhase(page);await choose(page,'result','success');expect((await queue(page))[0].outcome).toBe('error');await delivery(page).click();expect((await run(page)).status).toBe('error');await expect(page.locator('.tool01-output')).toContainText('回退');
 await b(page,'重试失败模拟').click();await drive(page);expect(await read(page)).toMatchObject({failureSeen:true,retrySeen:true});await expect(page.locator('[data-real-count]')).toHaveText('1');
});
test('cancelled and changed-model late results cannot overwrite new attempt or real counter',async({page})=>{
 await open(page,2);await start(page);await b(page,'体验真实React控件').click();await b(page,'开始模拟首访').click();await waitPhase(page);await b(page,'取消当前模拟').click();await b(page,'开始模拟首访').click();await waitPhase(page);const fresh=await run(page);await delivery(page).click();expect(await run(page)).toEqual(fresh);expect((await read(page)).lateSeen).toBe(true);await expect(page.locator('[data-real-count]')).toHaveText('1');await drive(page);
 await b(page,'开始模拟首访').click();await waitPhase(page);await model(page,'export').click();expect((await run(page)).status).toBe('idle');await delivery(page).click();expect((await run(page)).status).toBe('idle');
});
test('queue capacity is bounded and clean keeps only active envelope',async({page})=>{
 await open(page);for(let i=0;i<4;i++){await b(page,'开始模拟首访').click();await waitPhase(page);await b(page,'取消当前模拟').click();}
 await b(page,'开始模拟首访').click();expect((await queue(page)).length).toBe(4);expect((await run(page)).status).toBe('cancelled');await expect(feedback(page)).toContainText('最多4封');await delivery(page).click();await b(page,'开始模拟首访').click();await waitPhase(page);await b(page,'清理旧模拟结果').click();expect((await queue(page)).length).toBe(1);await drive(page);
});
for(const outcome of ['success','error','stale'])test(`last result ${outcome} leaves immediate real keyboard focus on visible enabled control`,async({page},info)=>{
 await open(page,2);if(outcome==='error')await choose(page,'result','error');await b(page,'开始模拟首访').click();await waitPhase(page);if(outcome==='stale')await b(page,'取消当前模拟').click();
 const trace=[];const keys=createKeyboardNavigator(page,expect,trace,{lesson:'tool01-delivery-'+outcome,profile:info.project.name});await keys.act(delivery(page),'last result');await expect(delivery(page)).toBeFocused();await expect(delivery(page)).toBeEnabled();expect(await queue(page)).toHaveLength(0);writeFileSync(`${out}/${info.project.name}-focus-${outcome}.json`,JSON.stringify(trace,null,2));
});
test('hidden document cancels model; station and route unmount clear volatile queue while preserving local progress',async({page})=>{
 await open(page,2);await b(page,'开始模拟首访').click();await waitPhase(page);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(async()=>(await run(page)).status).toBe('cancelled');expect((await read(page)).cancelSeen).toBe(true);
 await st(page,1).click();expect(await queue(page)).toHaveLength(0);expect((await run(page)).status).toBe('idle');await b(page,'返回综合B复习').click();await expect(page.locator('#writeb-stage-heading')).toBeVisible();await directory(page);expect(await queue(page)).toHaveLength(0);
});
test('quiz wrong answers explain and can retry without reload',async({page})=>{
 await open(page,3);for(let i=0;i<3;i++){const f=page.locator('.quiz-grid fieldset').nth(i);await f.getByRole('button').nth(1-tool01Questions[i].correct).click();await expect(f).toContainText('再想一想');await f.getByRole('button').nth(tool01Questions[i].correct).click();await expect(f).toContainText(tool01Questions[i].why);}
 await b(page,'完成并继续').click();await expect(page.locator('#tool01-context')).toBeVisible();
});
test('editable brief preserves source text, invalidates review after constraint edit, supports explicit retain',async({page})=>{
 await seed(page,good());await open(page);await b(page,'生成工具选型说明').click();await draft(page).fill((await draft(page).inputValue())+'\n用户手改：不迁移本站。');const edited=await draft(page).inputValue();
 await page.locator('#tool01-context').fill('静态托管，手动修改需求而不自动覆盖草稿');await expect(draft(page)).toHaveValue(edited);await expect(page.getByRole('checkbox',{name:'我已核对交互、数据、部署、真实与模拟边界。',exact:true})).toBeDisabled();
 await b(page,'保留编辑并确认当前实验参数').click();await expect(draft(page)).toHaveValue(edited);await expect(page.getByRole('checkbox',{name:'我已核对交互、数据、部署、真实与模拟边界。',exact:true})).toBeEnabled();await b(page,'重新生成工具选型草稿').click();expect(await draft(page).inputValue()).toContain('静态托管，手动修改需求');expect(await draft(page).inputValue()).not.toContain('用户手改');
});
test('copy denied supports manual selection without pretending delivery or evaluation',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error('denied fixture'))}}));await seed(page,good());await open(page);await b(page,'生成工具选型说明').click();await b(page,'复制工具选型说明').click();await expect(draft(page)).toBeFocused();expect(await draft(page).evaluate(e=>e.selectionEnd-e.selectionStart)).toBe((await draft(page).inputValue()).length);await expect(page.locator('.copy-feedback')).toContainText('自动复制不可用');
});
test('async copy uses clicked snapshot, preserves later edit and never steals external focus',async({page})=>{
 await page.addInitScript(()=>{window.copyCalls=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>new Promise((resolve,reject)=>{window.copyCalls.push(t);window.resolveCopy=resolve;window.rejectCopy=reject;})}});});await seed(page,good());await open(page);await b(page,'生成工具选型说明').click();const clicked=await draft(page).inputValue();await b(page,'复制工具选型说明').click();await draft(page).fill(clicked+'\n后续编辑');await b(page,'保留编辑并确认当前实验参数').click();await page.evaluate(()=>window.rejectCopy(Error('late failure fixture')));await expect(b(page,'保留编辑并确认当前实验参数')).toBeFocused();await expect(draft(page)).toHaveValue(clicked+'\n后续编辑');expect(await page.evaluate(()=>window.copyCalls)).toEqual([clicked]);
});
test('malformed progress bounded and missing boolean preserves usable interactive default',async({page})=>{
 await seed(page,{step:999,done:[-1,0,0,4,9],model:'fake',interactive:'yes',answers:[9,0,1],context:'x'.repeat(900),draft:'y'.repeat(12000),reviewed:true});await open(page);const d=await read(page);expect(d).toMatchObject({step:0,done:[0,4],model:'vite',interactive:true,answers:[null,0,1],reviewed:false});expect(d.context.length).toBe(700);expect(d.draft.length).toBe(10000);
});
test('unavailable browser storage still permits local interactions without false saved promise',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('storage denied fixture')};});await open(page);await start(page);await b(page,'体验真实React控件').click();await expect(page.locator('[data-real-count]')).toHaveText('1');await expect(page.locator('body')).toContainText('浏览器存储不可用');
});
test('B exit opens T01 with seven A/B T01–T05 entries and seven readonly previews plus32 numbered lessons',async({page})=>{
 await open(page);await b(page,'返回综合B复习').click();await b(page,'继续T01 · React / Next.js').click();await expect(page.locator('#tool01-stage-heading')).toBeVisible();
 const nav=page.getByRole('navigation',{name:'综合与工具模块'});if(!await nav.isVisible())await b(page,'☰ 课程').click();await expect(nav.getByRole('button')).toHaveCount(7);await expect(nav.getByRole('button',{name:'T04 · shadcn/ui · 可学习',exact:true})).toHaveCount(1);await expect(nav.getByRole('button',{name:'T05 · Motion · 可学习',exact:true})).toHaveCount(1);await expect(nav.getByRole('button',{name:/T06/})).toHaveCount(0);await expect(nav.locator('.coverage-preview').filter({hasText:'T06'})).toHaveCount(1);await expect(nav.locator('.coverage-preview')).toHaveCount(7);await expect(page.locator('.available-dot')).toHaveCount(32);await expect(page.locator('body')).toContainText('T02 Tailwind已开放');
});
test('five stations axe, viewport fit and local visual crops',async({page},info)=>{
 await open(page);for(let i=0;i<5;i++){await st(page,i).click();await axeCheck(page);await page.locator('.lesson-stage').screenshot({path:`${out}/${info.project.name}-station${i+1}.png`});}
});
test('short viewport long text retains fields and focus without horizontal clipping',async({page})=>{
 await page.setViewportSize({width:375,height:480});await seed(page,good());await open(page);await page.locator('#tool01-context').fill('长项目现状'.repeat(100));await b(page,'生成工具选型说明').click();const trace=[];const keys=createKeyboardNavigator(page,expect,trace,{lesson:'tool01-short',profile:'375x480'});await keys.seek(draft(page),'long editable brief');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
async function complete(p,act,select,toggle,type){
 await act(model(p,'request'),'request model');await act(b(p,'核对需求、部署与边界'),'invalid host check');await select('host','runtime');await act(b(p,'核对需求、部署与边界'),'valid check');await act(b(p,'完成并继续'),'station0 finish');
 await act(model(p,'vite'),'CSR');await start(p,act);await act(model(p,'export'),'static export');await start(p,act);await act(b(p,'完成并继续'),'station1 finish');
 await act(model(p,'request'),'request');await select('scenario','member');await select('host','runtime');await select('control','server');await act(b(p,'核对需求、部署与边界'),'boundary invalid');await select('control','client');await select('result','error');await act(b(p,'开始模拟首访'),'failure start');await waitPhase(p,act);await act(delivery(p),'failure deliver');expect((await run(p)).status).toBe('error');await select('result','success');await act(b(p,'重试失败模拟'),'retry');await drive(p,act);await act(b(p,'体验真实React控件'),'real React');
 await act(b(p,'开始模拟首访'),'cancel start');await waitPhase(p,act);await act(b(p,'取消当前模拟'),'cancel');await act(b(p,'开始模拟首访'),'new attempt');await waitPhase(p,act);const newer=await run(p);await act(delivery(p),'late');expect(await run(p)).toEqual(newer);await drive(p,act);await act(b(p,'完成并继续'),'station2 finish');
 for(let i=0;i<3;i++){const f=p.locator('.quiz-grid fieldset').nth(i);await act(f.getByRole('button').nth(1-tool01Questions[i].correct),'wrong'+i);await expect(f).toContainText('再想一想');await act(f.getByRole('button').nth(tool01Questions[i].correct),'retry'+i);}
 await act(b(p,'完成并继续'),'station3 finish');await act(b(p,'填入项目现状示例（替换本栏）'),'sample');await type(p.locator('#tool01-context'),'我补充：静态托管，不迁移项目。');await act(b(p,'生成工具选型说明'),'generate');await type(draft(p),'\n用户编辑：先验收再执行。');await act(b(p,'复制工具选型说明'),'copy');await toggle(p.getByRole('checkbox',{name:'我已核对交互、数据、部署、真实与模拟边界。',exact:true}),'review');await act(b(p,'完成T01工具专题'),'complete T01');expect((await read(p)).done).toEqual([0,1,2,3,4]);
}
async function seedPriors(p){await p.addInitScript(ks=>{for(const [i,k]of ks.entries())if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({step:0,done:[0],marker:'prior'+i}));Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error('denied fixture'))}});},priors);await p.goto('/');await expect(p.locator('#stage-heading')).toBeVisible();return p.evaluate(ks=>ks.map(k=>localStorage.getItem(k)),priors);}
async function resetFlow(p,act,keyboard){const before=await read(p);await act(b(p,'重置T01工具专题进度'),'reset open cancel');if(keyboard)await p.keyboard.press('Escape');else await act(b(p,'保留T01工具专题进度'),'cancel reset');expect((await read(p)).draft).toBe(before.draft);await expect(b(p,'重置T01工具专题进度')).toBeFocused();await act(b(p,'重置T01工具专题进度'),'reset open confirm');await act(b(p,'确认重置T01工具专题'),'confirm reset');await expect(p.locator('#tool01-stage-heading')).toBeFocused();expect(await read(p)).toMatchObject({done:[],step:0,context:'',draft:''});}
test('real Tab entire course wrong retry refresh cancel confirm reset retains prior34 stores',async({page},info)=>{
 const prior=await seedPriors(page),trace=[];const keys=createKeyboardNavigator(page,expect,trace,{lesson:'tool01-full',profile:info.project.name});await directory(page,keys.act);
 const select=async(id,value)=>{const l=page.locator('#tool01-'+id);await keys.seek(l,id);const values=await l.locator('option').evaluateAll(es=>es.map(e=>e.value));await page.keyboard.press('Home');for(let i=0;i<values.indexOf(value);i++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(l).toHaveValue(value);};
 const type=async(l,text)=>{await keys.seek(l,'edit');await page.keyboard.press('End');await page.keyboard.type(text);};
 await complete(page,keys.act,select,keys.toggle,type);const saved=(await read(page)).draft;await page.reload();await directory(page,keys.act);await expect(draft(page)).toHaveValue(saved);await resetFlow(page,keys.act,true);expect(await page.evaluate(ks=>ks.map(k=>localStorage.getItem(k)),priors)).toEqual(prior);writeFileSync(`${out}/${info.project.name}-keyboard-full.json`,JSON.stringify(trace,null,2));
});
for(const reducedMotion of ['no-preference','reduce'])test(`zero-keyboard touch complete ${reducedMotion} wrong retry refresh cancel confirm`,async({browser},info)=>{
 const c=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true,reducedMotion});const p=await c.newPage();await p.addInitScript(()=>{window.keyEvents=0;addEventListener('keydown',()=>window.keyEvents++);});const prior=await seedPriors(p);const actions=[];const act=async(l,n)=>{await l.tap();actions.push(n);};await directory(p,act);
 await complete(p,act,(id,v)=>choose(p,id,v),async(l,n)=>act(l,n),async(l,t)=>l.fill((await l.inputValue())+t));const saved=(await read(p)).draft;await p.reload();await directory(p,act);await expect(draft(p)).toHaveValue(saved);await resetFlow(p,act,false);expect(await p.evaluate(()=>window.keyEvents)).toBe(0);expect(await p.evaluate(ks=>ks.map(k=>localStorage.getItem(k)),priors)).toEqual(prior);writeFileSync(`${out}/${info.project.name}-touch-${reducedMotion}.json`,JSON.stringify({actions,keyboardEvents:0,fixtures:'selectOption and fill supply select/text values; all buttons native taps, not OS picker/IME test'},null,2));await c.close();
});

function save(n,v){writeFileSync(`${out}/${n}.json`,JSON.stringify(v,null,2));}
test("copy failure protects external focus, changed text and generation mutex through navigation and reset", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((resolve, reject) =>
            (window.copiesB ??= []).push({ resolve, reject }),
          ),
      },
    }),
  );
  await seed(page, good());
  await open(page);
  await b(page, "生成工具选型说明").click();
  await b(page, "复制工具选型说明").click();
  await st(page, 0).click();
  await st(page, 4).click();
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.copiesB.length)).toBe(2);
  await page.evaluate(() => window.copiesB[0].reject(Error("old")));
  await b(page, "复制工具选型说明").click();
  expect(await page.evaluate(() => window.copiesB.length)).toBe(2);
  await draft(page).fill(
    (await draft(page).inputValue()) + "\nEdit while copying.",
  );
  await page.evaluate(() => window.copiesB[1].reject(Error("current changed")));
  await expect(draft(page)).toBeFocused();
  await expect(page.locator(".copy-feedback")).toContainText("草稿已修改");
  await b(page, "复制工具选型说明").click();
  await b(page, "保留编辑并确认当前实验参数").click();
  await page.evaluate(() => window.copiesB[2].reject(Error("external")));
  await expect(b(page, "保留编辑并确认当前实验参数")).toBeFocused();
  await expect(page.locator(".copy-feedback")).toContainText(
    "当前焦点保持不变",
  );
  await b(page, "复制工具选型说明").click();
  await b(page, "重置T01工具专题进度").click();
  await b(page, "确认重置T01工具专题").click();
  await expect(page.locator("#tool01-stage-heading")).toBeFocused();
  await page.evaluate(() => window.copiesB[3].resolve());
  await expect(page.locator("#tool01-stage-heading")).toBeFocused();
  expect((await read(page)).generated).toBe(false);
  save(`copy-generations-${info.project.name}`, {
    copies: await page.evaluate(() => window.copiesB.length),
    reset: await read(page),
  });
});
test("late navigation RAF respects real Tab focus and cannot steal focus after unmount", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.framesB = [];
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      window.holdB
        ? (window.framesB.push(cb), 80000 + window.framesB.length)
        : raf(cb);
  });
  await open(page);
  await page.evaluate(() => (window.holdB = true));
  await st(page, 1).click();
  const trace = [],
    k = createKeyboardNavigator(page, expect, trace, {
      lesson: "tool01-late",
      profile: info.project.name,
    });
  const target = page.locator("#tool01-scenario");
  await k.seek(target, "user Tab after navigation");
  await page.evaluate(() =>
    window.framesB.forEach((cb) => cb(performance.now())),
  );
  await expect(target).toBeFocused();
  await page.evaluate(() => (window.holdB = false));
  await st(page, 2).click();
  await expect(page.locator("#tool01-stage-heading")).toBeFocused();
  await page.evaluate(() => (window.holdB = true));
  await st(page, 0).click();
  await page.evaluate(() => {
    window.oldBFrames = [...window.framesB];
    window.holdB = false;
  });
  const nav = page.getByRole("navigation", { name: "课程目录" });
  if (!(await nav.isVisible())) await b(page, "☰ 课程").click();
  await nav.getByRole("button").first().click();
  await expect(page.locator("#stage-heading")).toBeFocused();
  await page.keyboard.press("Tab");
  const before = await page.evaluate(() => document.activeElement.outerHTML);
  await page.evaluate(() =>
    window.oldBFrames.forEach((cb) => cb(performance.now())),
  );
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(
    before,
  );
  save(`late-navigation-${info.project.name}`, trace);
});

test('real-time reduced motion keeps model input usable and no idle or unmounted RAF loop runs',async({page})=>{
 await page.addInitScript(()=>{window.rafCount=0;const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{window.rafCount++;return raf(cb);};});await open(page,1);await b(page,'开始模拟首访').click();await waitPhase(page);await page.emulateMedia({reducedMotion:'reduce'});await drive(page);await b(page,'体验真实React控件').click();await expect(page.locator('[data-real-count]')).toHaveText('1');const n=await page.evaluate(()=>window.rafCount);await page.waitForTimeout(100);expect(await page.evaluate(()=>window.rafCount)).toBe(n);await page.emulateMedia({reducedMotion:'no-preference'});await b(page,'返回综合B复习').click();await expect(page.locator('#writeb-stage-heading')).toBeFocused();const m=await page.evaluate(()=>window.rafCount);await page.waitForTimeout(100);expect(await page.evaluate(()=>window.rafCount)).toBe(m);
});
