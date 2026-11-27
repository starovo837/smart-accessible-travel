import { writeFile } from 'node:fs/promises'
import { platformClient,hardwareOptions,accountName } from '../deployment/modelscope/platform.mjs'
const api=platformClient(process.env.MS_DEPLOY_TOKEN)
const account=await api('/users/me')
const owner=accountName(account)
if(owner!=='starovo')throw Error('当前令牌不属于已确认的 starovo 账号，已停止。')
const options=hardwareOptions(await api('/studios/hardware?sdk_type=docker'))
const report={checkedAt:new Date().toISOString(),owner,hardware:options.map(item=>({name:item.name,display_name:item.display_name,resource_type:item.resource_type,is_free:item.is_free,available:item.available,enabled:item.enabled,description:item.description}))}
await writeFile(new URL('../.studio-check.json',import.meta.url),JSON.stringify(report,null,2))
console.log('已验证账号：'+owner)
console.log('Docker 创空间可用资源（只查询，未创建、未启动、未扣费）：')
console.log(JSON.stringify(report.hardware,null,2))
console.log('检查结果已保存为项目 .studio-check.json，不含访问令牌。')
console.log('请把窗口中的资源结果或此检查文件交给助手；不要发送令牌。')
