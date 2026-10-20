import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
import { finalizePresentation } from '/Users/patrick/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations/container_tools/artifact_tool_utils.mjs';

const ROOT='/Users/patrick/Documents/ChatGPT/Spellcast';
const BUILD=path.join(ROOT,'.pitch-build');
const OUT=path.join(ROOT,'output/pitch');
const SKILL='/Users/patrick/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations';
const PY='/Users/patrick/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const C={navy:'#080F1C',blue:'#83C9FA',white:'#F3F5F6',muted:'#ACB7C7',ink:'#152133',paper:'#EBEDE9',gray:'#536073',warm:'#F4C99D'};
const FONT='Helvetica Neue';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const S={
 ofcom:'https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/media-nations/2025/media-nations-2025-uk-report.pdf',
 audio:'https://www.ofcom.org.uk/tv-radio-and-on-demand/digital-radio/top-trends-uk-listening-habits-2025',
 ons:'https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/families/bulletins/familiesandhouseholds/2025',
 hue:'https://www.philips-hue.com/en-gb/products/smart-light-starter-kits',
 flic:'https://www.mynewsdesk.com/flic/pressreleases/flic-duo-pre-orders-are-open-now-exclusive-offers-and-limited-bundles-available-today-3365357',
 media:'https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker',
 ultra:'https://docs.ultraleap.com/TouchFree/touchfree-user-manual/index.html'
};
let idx=0;
function text(s,str,x,y,w,h,size=28,color=C.white,bold=false){
 const a=s.shapes.add({geometry:'textbox',name:str.slice(0,50),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 a.text=str;a.text.style={typeface:FONT,fontSize:size,color,bold,autoFit:'none',insets:0,verticalAlignment:'top',wrap:'square'};return a;
}
function slide(title,{light=false,notes='',appendix=false}={}){
 const s=p.slides.add();idx++;s.background.fill=light?C.paper:C.navy;
 text(s,appendix?'SPELLCAST / APPENDIX':'SPELLCAST',64,36,700,24,15,light?C.gray:C.muted,true);
 text(s,String(idx).padStart(2,'0'),1172,36,44,24,15,light?C.gray:C.muted);
 if(title)text(s,title,64,100,1140,116,49,light?C.ink:C.white,true);
 s.speakerNotes.text=notes;return s;
}
function footer(s,str,light=false){text(s,str,64,651,1148,42,15,light?C.gray:C.muted);}
function note(script,refs=[]){return script+'\n\nSources and qualifications\n'+refs.join('\n')+'\nResearch checked 17 October 2026. Commercial figures are proposals, not traction.';}
async function hero(s){let b=await fs.readFile(path.join(BUILD,'assets/cover.png'));s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:'Concept illustration of a hand pointing at a glowing desk lamp',fit:'cover',position:{left:0,top:0,width:1280,height:720}});}
function table(s,values,x,y,width,height,widths,light=false,size=24){
 const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width,height,columnWidths:widths,values});
 t.borders.assign({fill:light?'#CBD1D0':'#27374C',width:0.7,style:'solid'});
 for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){
  const cell=t.getCell(r,c);cell.fill=r===0?(light?'#D9DEDA':'#15283F'):(light?C.paper:C.navy);
  cell.text.style={typeface:FONT,fontSize:size,color:light?C.ink:C.white,bold:r===0||c===0,insets:14,autoFit:'none'};
 }
 return t;
}

// 01: Ten seconds. Editable type over a generated concept photograph.
{
const s=p.slides.add();idx++;await hero(s);
text(s,'Spellcast',64,69,740,110,90,C.white,true);
text(s,'Your room,\nwithin reach.',68,224,625,170,60,C.white,true);
text(s,'Gesture control for lights and music',69,439,650,56,29,C.muted);
text(s,'Build Day / Durham / 17 October 2026',68,639,770,30,17,C.muted);
text(s,'Concept illustration',1020,655,210,28,13,C.muted);
s.speakerNotes.text=note('10 seconds\nSpellcast lets you point at a device in your room and control it with your hands. We are starting with the two things students adjust at their desks: lighting and music.', ['Visual: AI-generated concept illustration using the built-in image-generation tool. It is not a photo of the prototype.']);
}
// 02: Evidence and a focused customer problem.
{
const s=slide('Smart rooms still interrupt us',{notes:note('25 seconds\nOur first user is a student with a Mac, a smart lamp and Spotify. Adjusting the room still means reaching for an app, finding a switch or speaking a command. The cost we want to reduce is that interruption. Ofcom found smart speakers in 40% of UK households, and three in five smart-speaker users said a request for a radio station had played the wrong thing. That is evidence of control friction, not proof that they will pay for gestures.',[S.ofcom+' (printed page 92, Q1 2025 smart-speaker ownership)',S.audio+' (21 May 2025, wrong radio-station playback). Do not interpret this as 60% of requests failing.'])});
text(s,'Students with smart desk setups interrupt study\nto adjust lights and music through separate controls.',64,228,1120,100,30,C.muted);
text(s,'40%',64,376,450,115,94,C.blue,true);
text(s,'of UK households had a smart speaker',68,503,475,82,27);
text(s,'3 in 5',669,376,530,115,94,C.warm,true);
text(s,'smart-speaker users have had the wrong\nradio station play after a request',674,503,528,100,27);
footer(s,'Sources: Ofcom, Media Nations 2025 and Audio Listening 2025. Demand for gestures remains a hypothesis.');
}
// 03: Concrete features. No unsupported performance claims.
{
const s=slide('Gesture control for lights and music',{notes:note('20 seconds\nSpellcast uses the webcam already on the Mac. We calibrate where the lamp and speaker appear in the camera view. Pointing selects the device, and the other hand controls it. The current code connects the lamp through Zigbee2MQTT and controls the Mac Spotify app. It also includes Calm, Study and Party scenes. This prototype uses two-dimensional camera calibration, not automatic room understanding.', ['Repository: src/App.tsx, src/tracking/handTracker.ts, src/targeting/useLampTargeting.ts, src/control/*, electron/main.ts, electron/spotify.ts, electron/scenes.ts. The source overview files contain older progress descriptions.'])});
const ys=[267,391,515];
const titles=['Lighting','Music','Room scenes'];
const desc=['Power, brightness and colour\non the paired Zigbee lamp','Spotify playback, volume and next track','Calm, Study and Party\ncoordinate light and music'];
for(let i=0;i<3;i++){
text(s,String(i+1).padStart(2,'0'),64,ys[i]-8,115,84,58,C.blue);
text(s,titles[i],218,ys[i],350,60,34,C.white,true);
text(s,desc[i],581,ys[i]+1,628,82,28,C.muted);
}
footer(s,'Current scope: macOS, webcam, calibrated targets, paired Zigbee lamp and the Spotify desktop app.');
}
// 04: A deliberate hold slide for a live demonstration.
{
const s=slide('Watch the room respond',{notes:note('45 seconds. Switch to the running app.\nBefore pitching, pair the bulb, open and sign into Spotify, permit Automation, enable the camera and calibrate both target boxes. Start with no scene active.\n0-15 sec: point at the lamp. Use the other hand open for ON, fist for OFF, then reopen and move it up or down for brightness.\n15-30 sec: point directly at the speaker. Move the other hand to adjust Spotify volume.\n30-45 sec: touch the two index fingertips together twice, separating them between contacts, to enter Calm. Repeat if time permits to show Study. Keep Party optional. Scene presets override individual lamp gestures.\nSay: One camera, two devices, and a room that responds to where you point.\nIf hardware fails, use the on-screen controls to explain the same interaction and say clearly which connection is unavailable. Do not imply a recorded result.',['Gesture evidence: src/control/useTwoHandLampControl.ts, useSpotifyHandControl.ts, useTwoHandSceneControl.ts. Current scene sequence: none, Calm, Study, Party, none.'])});
text(s,'LIVE DEMO',66,239,800,63,40,C.blue,true);
text(s,'Lamp',64,350,325,66,44,C.white,true);
text(s,'Point to select.\nOpen or close your hand.\nRaise or lower brightness.',64,433,325,150,27,C.muted);
text(s,'Music',468,350,325,66,44,C.white,true);
text(s,'Point at the speaker.\nRaise or lower the\nSpotify volume.',468,433,325,150,27,C.muted);
text(s,'Scene',872,350,340,66,44,C.white,true);
text(s,'Tap index fingertips\ntogether twice to change\nlight and music together.',872,433,340,150,27,C.muted);
footer(s,'Webcam perception runs on the Mac. Lamp control needs the local Zigbee setup. Spotify remains its own service.');
}
// 05: Native comparison table.
{
const s=slide('A different way to choose the device',{light:true,notes:note('20 seconds\nApps give precise controls. Voice can work across the room. Flic already sells physical controls with gesture support. Spellcast adds a different selection method: point at the actual visible object. We are not claiming that gesture control is new, or that this prototype is universally easier. The hypothesis is that direct pointing is useful in a quiet desk setup.',[S.hue,S.flic,'Spellcast source: src/targeting/* and src/control/*. Assessment compares interaction approaches, not measured task speed. Existing shortcuts and automations can already combine actions.'])});
table(s,[['Approach','Device selection','Main requirement'],['Apps / dashboards','Choose an item on a screen','Phone or desktop interaction'],['Voice assistants','Speak a device name','Microphone and voice command'],['Flic Duo','Press or gesture with a controller','Dedicated physical control'],['Spellcast','Point at a calibrated object','Mac webcam and local device setup']],64,233,1150,330,[285,430,435],true,25);
text(s,'Our bet: pointing feels more direct for visible desk devices.',64,591,1138,48,29,C.ink,true);
footer(s,'Product sources: Philips Hue and Flic. Comparison reflects interaction methods, not a usability benchmark.',true);
}
// 06: Honest top-down proxy and bounded launch ambition.
{
const s=slide('UK market and launch scope',{notes:note('20 seconds\nOur first audience is students with compatible desk setups. For scale, we use a broad UK smart-speaker household proxy, not a count of compatible Spellcast buyers. Twenty-nine million UK households times 40% gives 11.6 million. Our serviceable scenario assumes just 1% also meets the Mac, webcam, lighting and willingness criteria. Our first-year target is 1,000 paying rooms. We must measure that 1% assumption and demand before relying on this market case.',[S.ons+' (2025 household estimate, released 17 April 2026)',S.ofcom+' (Q1 2025 ownership share)','Calculation: 29,000,000 × 0.40 = 11,600,000. SAM scenario: 11,600,000 × 0.01 = 116,000. SOM target: 1,000 / 116,000 = 0.86%. Price proposal: GBP 29 per year.'])});
const x=[64,470,875];
const nums=['11.6m','116k','1,000'];
const labs=['TAM / category proxy','SAM / assumed fit','SOM / year-one target'];
const bodies=['UK households with\na smart speaker','1% assumed to fit the\ninitial supported setup','Paying rooms after\na successful beta'];
for(let i=0;i<3;i++){
text(s,labs[i],x[i],245,350,43,22,C.muted,true);
text(s,nums[i],x[i]-3,311,370,110,83,i===2?C.warm:C.blue,true);
text(s,bodies[i],x[i],451,350,98,28);
}
text(s,'£29,000 annual gross revenue at 1,000 paying rooms',64,578,1155,54,31,C.white,true);
footer(s,'TAM is a broad proxy. SAM, SOM and £29/year are planning assumptions. Sources: ONS and Ofcom, 2025 data.');
}
// 07: Acquisition arithmetic, not fictional traction.
{
const s=slide('The first 100 users',{light:true,notes:note('15 seconds\nWe start in Durham with students who already own compatible hardware. Recruit 20 supervised testers through computing and gaming societies. Then share a real demonstration and a compatibility guide with maker communities and desk-setup creators. The planning funnel is 400 qualified visits and 25% activation to reach 100 installed setups. These are targets, not existing users.', ['Acquisition proposal. No university, society, creator partnership or installed-user count has been verified. Activation means a user completes a gesture command on a real paired device.'])});
text(s,'100',57,236,465,208,164,C.ink,true);
text(s,'activated setups',68,465,437,56,32,C.gray);
text(s,'01   Durham pilot',572,244,630,51,32,C.ink,true);
text(s,'Recruit 20 compatible testers through\ncomputing and gaming societies.',572,304,620,82,27,C.gray);
text(s,'02   A demo people can share',572,423,630,50,32,C.ink,true);
text(s,'Publish the real interaction with a setup guide.\nReach maker groups and desk-setup creators.',572,482,630,94,27,C.gray);
footer(s,'Target funnel: 400 qualified visits × 25% activation = 100 users. Proposed channels and conversion, not traction.',true);
}
// 08: Revenue as a testable offer.
{
const s=slide('A software licence for the room',{notes:note('15 seconds\nThe beta is free. Our paid-launch proposal is 29 pounds per year for one supported room. Enthusiasts would pay for a maintained control layer and compatibility updates. Existing hardware is separate. At 1,000 customers this is 29,000 pounds in annual gross revenue before fees, tax and support. We will test payment after users have tried it. Willingness to pay and renewal are unproven.', ['Commercial proposal, not an existing subscription. No revenue or customer commitments have been verified. Hardware, Spotify service and integration support costs remain separate.'])});
text(s,'£29',57,235,580,180,151,C.blue,true);
text(s,'per room / year',67,436,490,63,34,C.white);
text(s,'Free beta',704,250,496,57,36,C.white,true);
text(s,'Trial with compatible hardware\nbefore a paid launch.',704,320,490,90,29,C.muted);
text(s,'Proposed paid offer',704,452,496,52,32,C.white,true);
text(s,'Supported lighting and music controls,\nwith ongoing compatibility updates.',704,514,494,89,27,C.muted);
footer(s,'Pricing hypothesis. Hardware and music service costs are separate. No cloud video inference is required.');
}
// 09: Specific ask, no fabricated link or funding requirement.
{
const s=p.slides.add();idx++;await hero(s);
text(s,'Spellcast',64,63,760,94,78,C.white,true);
text(s,'Your space,\nwithin reach.',66,218,640,175,62,C.white,true);
text(s,'20 students. One room each.',67,454,770,63,37,C.blue,true);
text(s,'Join the first pilot.',68,540,760,56,30,C.white);
text(s,'Concept illustration',1020,655,210,28,13,C.muted);
s.speakerNotes.text=note('10 seconds\nWe have built the interaction. The next step is proving it belongs in everyday life. We are looking for 20 students with compatible desk setups to try Spellcast in their own rooms. Your space, within reach.',['Pilot recruitment is the proposed next step. This does not claim 20 users already exist. Visual: AI-generated concept illustration.']);
}
// 10: Transparent product evidence and constraints for Q&A.
{
const s=slide('Prototype scope and boundaries',{appendix:true,notes:note('Q&A\nThe code is the current source of truth. PRODUCT.md and the earlier README progress list predate many implemented features. We inspected source for the claims in this deck. The deck does not claim a measured end-to-end latency, recognition accuracy or independent physical-device verification from this research session.', ['src/App.tsx; src/tracking/handTracker.ts; src/targeting/useLampTargeting.ts; electron/main.ts; electron/spotify.ts; electron/scenes.ts; README.md. Checkout observed at commit 23970ca on 17 October 2026.'])});
text(s,'Implemented in the repo',64,236,550,51,33,C.blue,true);
text(s,'Two-hand tracking and calibrated targeting\nLamp power, brightness and colour\nSpotify controls and coordinated scenes\nLocal model assets and camera processing',64,313,573,230,27,C.white);
text(s,'Current limits',704,236,500,51,33,C.warm,true);
text(s,'Mac must stay awake with camera in view\nTargets need manual calibration\nLamp needs Zigbee2MQTT and a coordinator\nSpotify needs macOS Automation access',704,313,500,245,27,C.white);
footer(s,'Hardware demo is the evidence for physical performance. Other brands, arbitrary rooms and accessibility remain unvalidated.');
}
// 11: Native arithmetic and sensitivity.
{
const s=slide('Market assumptions and sensitivity',{light:true,appendix:true,notes:note('Q&A\nTAM proxy combines two UK datasets for 2025 with slightly different measurement periods. It does not measure ownership of a supported lamp, a Mac, or demand for a webcam interface. The 1% combined-fit rate is a placeholder to replace with actual research. At 0.5% fit the serviceable scenario is 58,000 rooms. At 2% it is 232,000. Market-size revenues are hypothetical annual gross spend at the proposed price, not forecast sales.', [S.ons,S.ofcom,'Arithmetic: TAM proxy 11.6m × GBP 29 = GBP 336.4m; SAM scenario 116k × GBP 29 = GBP 3.364m; SOM target 1k × GBP 29 = GBP 29k.'])});
table(s,[['Scope','Room / household calculation','Annual gross at £29'],['TAM proxy','29m UK households × 40% = 11.6m','£336.4m theoretical'],['SAM scenario','11.6m × assumed 1% fit = 116k','£3.364m scenario'],['SOM target','1,000 paid rooms in year one','£29k target']],64,237,1150,305,[245,565,340],true,24);
text(s,'At 0.5% fit: 58k rooms. At 2% fit: 232k rooms.',64,578,1140,51,30,C.ink,true);
footer(s,'Broad category proxy, assumed compatibility and adoption, then a sales target. None are measured product demand.',true);
}
// 12: How to earn the claims we cannot yet make.
{
const s=slide('The pilot tests everyday usefulness',{appendix:true,notes:note('Q&A\nRun a pilot with 20 students who have the supported setup. Compare the same lamp and music tasks using Spellcast and their existing controls, counterbalancing the order. Count completed actions and unintended activations. Test daylight and dim rooms. Follow up after one week and offer a real paid reservation only after a trial. These thresholds are proposed decision rules, not results.', ['Research design proposal. No customer interviews, usability study, retention test or willingness-to-pay evidence was supplied or conducted for this deck.'])});
const rows=[['Task reliability','At least 90% of prompted actions succeed across pilot tasks'],['Accidental control','No more than one unintended command per user-hour'],['Continued use','At least 10 of 20 testers choose to use it after one week'],['Payment signal','At least 5 of 20 make a paid reservation after the trial']];
rows.forEach(([a,b],i)=>{text(s,a,64,245+i*87,350,57,29,C.blue,true);text(s,b,470,246+i*87,733,69,26,C.white);});
footer(s,'Proposed go / no-go thresholds. Compare with current controls and measure camera comfort, fatigue and setup friction.');
}
// 13: Human-readable source list with real links in editable text.
{
const s=slide('Research sources',{light:true,appendix:true,notes:note('Reference appendix. Primary sources support the problem context and competitor capabilities. Every commercial figure and acquisition funnel is an explicit proposal. Research date: 17 October 2026.',Object.values(S))});
const refs=[
 ['01','Ofcom / Media Nations 2025','40% UK household smart-speaker ownership. Printed page 92.',S.ofcom],
 ['02','Ofcom / UK listening habits 2025','Three in five users report incorrect radio-station playback.',S.audio],
 ['03','ONS / Families and households, 2025','29.0 million UK households. Released 17 April 2026.',S.ons],
 ['04','Philips Hue and Flic','Existing app, switch and physical gesture-control alternatives.',S.flic],
 ['05','Spellcast / current source code','Features and current integration boundaries, commit 23970ca.',null]
];
refs.forEach(([n,a,b,url],i)=>{const y=228+i*78;text(s,n,64,y,70,50,27,C.gray);const q=text(s,a,160,y,1040,40,27,C.ink,true);if(url)q.text.get(a).link={uri:url,isExternal:true};text(s,b,160,y+38,1040,36,21,C.gray);});
footer(s,'Full links and source qualifications appear in the relevant speaker notes. Cover visual is a concept illustration.',true);
}

await fs.mkdir(path.join(BUILD,'previews'),{recursive:true});
for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(BUILD,'previews',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
 console.log('Rendered',i+1);
}
const candidatePath=path.join(BUILD,'candidate.pptx');
await(await PresentationFile.exportPptx(p)).save(candidatePath);
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath,finalPath:path.join(OUT,'Spellcast-Pitch.pptx'),pythonExecutable:PY,integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],requiredNativeTableOwnerSlides:[5,11],fontPolicy:{basis:'design',families:[FONT]},verifyArtifactToolImport:true,receiptPath:path.join(BUILD,'validation.json')});
console.log(JSON.stringify(result));
await fs.writeFile(path.join(BUILD,'deck.json'),JSON.stringify(p.toProto()));
