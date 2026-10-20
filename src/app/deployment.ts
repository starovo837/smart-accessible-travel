export const isStudio=import.meta.env.VITE_DEPLOYMENT==='studio'
export const processingLocation=isStudio?'魔搭创空间服务端':'当前电脑'
export const processingNotice=isStudio?'本次商品文字、图片及问题会发送到魔搭创空间，在服务端开源模型中处理；不调用付费模型API。请使用公开商品资料，不上传病历、证件或联系人等敏感信息。':'本次资料交给当前电脑模型处理，不发送到云端。'
