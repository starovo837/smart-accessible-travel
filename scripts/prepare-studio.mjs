import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareStudio } from '../deployment/modelscope/package.mjs'
const root=fileURLToPath(new URL('../',import.meta.url))
const stamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,17)
const destination=path.join(root,'.studio-upload','source-'+stamp)
const result=await prepareStudio(root,destination)
console.log('已整理魔搭创空间上传目录：'+result.directory)
console.log('文件数：'+result.files+'；未复制本地密钥、用户记录、模型权重或其他项目。')
