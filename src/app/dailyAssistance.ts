// Color and brightness routines adapted from Hello AI (MIT), fuwawas/hello-ai-accessibility.
// Camera exposure and white balance affect these estimates; they are not lux readings.
export function imageSummary(data:Uint8ClampedArray,width:number,height:number){
 let luminance=0,samples=0,r=0,g=0,b=0,centerSamples=0
 for(let y=0;y<height;y+=4)for(let x=0;x<width;x+=4){const i=(y*width+x)*4;luminance+=data[i]*.299+data[i+1]*.587+data[i+2]*.114;samples++;if(Math.abs(x-width/2)<width/6&&Math.abs(y-height/2)<height/6){r+=data[i];g+=data[i+1];b+=data[i+2];centerSamples++}}
 const brightness=samples?Math.round(luminance/samples):0
 return {brightness,light:brightness>200?'很亮':brightness>150?'较亮':brightness>100?'适中':brightness>50?'偏暗':'很暗',color:colorName(r/Math.max(1,centerSamples),g/Math.max(1,centerSamples),b/Math.max(1,centerSamples))}
}
export function colorName(r:number,g:number,b:number){
 const max=Math.max(r,g,b),min=Math.min(r,g,b),diff=max-min
 if(diff<30)return max>200?'白色':max>150?'浅灰色':max>80?'灰色':max>30?'深灰色':'黑色'
 let hue=max===r?((g-b)/diff)%6:max===g?(b-r)/diff+2:(r-g)/diff+4;hue=(hue*60+360)%360
 const prefix=(max+min)/2<80?'深':(max+min)/2>200?'浅':''
 return prefix+(hue<15||hue>=345?'红色':hue<45?'橙色':hue<70?'黄色':hue<160?'绿色':hue<200?'青色':hue<260?'蓝色':hue<290?'紫色':'粉色')
}
export const dailyTemplates=[
 {id:'leave',title:'出门前准备',steps:['确认目的地、天气和需要的陪同。','带好钥匙、手机与必要的设备资料。','检查辅具状态和电量，确认路线后再出发。']},
 {id:'rest',title:'休息一下',steps:['选择适合自己的安全位置休息，不必为了任务勉强转移。','按平时的方式放松，确认需要的物品在手边。','准备好了再继续；不舒服时可以暂停并寻求帮助。']},
 {id:'appointment',title:'准备预约',steps:['找到要联系的机构和预约方式。','写下需要的协助、问题和可用时间。','联系后核对时间、地点、无障碍设施与回复记录。']}
]
export type DailyDestination='home'|'fitting'|'shop'|'travel'|'support'|'vision'|'captions'|'communication'|'reminders'|'steps'
export function voiceDestination(raw:string):DailyDestination|'stop'|null{const value=raw.replace(/[\s，。！？]/g,'');return /停止朗读|别读了/.test(value)?'stop':/三维|试配/.test(value)?'fitting':/买辅具|购物|商品/.test(value)?'shop':/出行|交通/.test(value)?'travel':/首页|主页/.test(value)?'home':/读字|看图/.test(value)?'vision':/字幕/.test(value)?'captions':/打字沟通/.test(value)?'communication':/日常提醒/.test(value)?'reminders':/一步一步/.test(value)?'steps':/辅助中心|全部功能/.test(value)?'support':null}
