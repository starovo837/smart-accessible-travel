# 规则核验链路：A 批

日期：2026-11-17。仅处理规则核验与真实性呈现，B–E等待逐批确认。没有改设备证据、授权存储、会话限流、三维计算、导航返回或AI超时。

## 文件与边界

- `src/app/ruleCatalog.ts`：记录增加核查人，校验URL、状态、日期、文本上限与人工核查信息；有效期最多7天。
- `server/rule-service.mjs`：抓取、原文比对、人工批准分离。原文变化与抓取失败使记录不可用；刷新不批准、不续期；旧版自动批准记录降级。
- `scripts/review-rules.mjs`：本地核查命令，不依赖付费API或新增运行时依赖。
- `TravelCoverage`、`TravelQuery`、出行结果页、`App.tsx`：显示有效核验数、0条说明、官方入口；输入页来源范围默认展开，结果页放在摘要前。更新按钮只GET核验记录。
- `RuleReview`：本机审核须明确填写核查人、说明与原文复核勾选，批准时重新抓取并比对hash。创空间仍关闭本机审核接口。
- `deployment/modelscope/package.mjs`、`start.mjs`：校验可选人工记录，随现有server白名单入镜像，启动加载；缺少或不合法时仅用未核验种子，不发起网络核验。
- 新增/更新规则及部署测试；README、分类冲突与目录说明同步校正。

## 本地命令

只检查，不写文件：

```powershell
node scripts/review-rules.mjs --check
```

人工逐条阅读原文、核对适用范围后，由核查人填写自己的工作代称与说明：

```powershell
$env:SAI_DATA_DIR = "D:\your-data-directory"
node scripts/review-rules.mjs --reviewer "核查人的工作代称" --note "实际阅读与核查范围、结论"
```

不应直接复制示例代称作为真实记录。没有这两个输入则拒绝执行批准，且不发起抓取。每条必须全部摘录命中，才写入checkedAt、7天expiresAt、SHA256、reviewer、reviewNote；不命中为changed，下载失败为fetch-failed。共同URL只下载一次。原文比较使用plainRuleText统一空白、HTML与乘号。单次从请求到流读取完成最多15秒，响应体最多2MB；`redirect:error`，HTTPS官方主机白名单，无URL凭据或自定义端口。

## 加载与失败路径

写盘先校验，使用同目录临时文件与原子重命名；失败不谎报成功。读取时不信任未知目录ID或被改换的来源。缺少人工信息的旧verified不再有效。批准前重新读取当前原文，hash变化则落盘changed并拒绝批准；下载失败落盘fetch-failed。

可选生产记录：`deployment/modelscope/rules.verified.json`，内容为规则数组，来源必须与当前ruleCatalog一致。整理器拒绝格式错误、无人工信息或疑似凭据。整理时生成镜像专用的`server/bundled-rules.verified.json`，不扩大Docker COPY范围。启动器复制到SAI_DATA_DIR/rules.json；没有文件时重置未核验种子，避免复用旧版自动批准。保留已过期记录及原文，不能用其阈值判定。

## 数量与真实性

ruleCatalog为3条：铁路国内携带品、国航辅助设备、国航轮椅电池，共2个不同官方网页。咨询目录11条，与条款合计14个入口；不是14条已核验规则。生活服务26条，学习资源18条，辅助中心19项，分别统计。当前未提供生产人工核查文件，实际可核验数仍为0；测试中的审核人、网页和批准记录全部是合成资料，不进入发布记录。

冲突通用引擎支持三类，但生产仅配置流程冲突；未声称已接入生产通道或相反指令检测。服务卡日期的补齐属于后续E2，本批不把文档表格日期当作所有卡片已显示。

## 验收记录

- `node --test tests/*.test.mjs`：279项通过（原265项，新增14项规则/部署测试）；覆盖人工输入、全部摘录、7天期限、刷新不续期、旧记录降级、URL/文本上限、全程超时、原子写盘、批准时来源变化、启动缺文件/无效文件、白名单镜像副本等。
- `npm run build`：通过文案断言、TypeScript、Vite与离线壳构建。当前环境由`pnpm dlx npm@11 run build`调用相同npm脚本，无新增项目依赖。保留既有大包体警告，未在本批重构拆包。
- `node scripts/prepare-studio.mjs`：干净白名单包193个文件整理成功，未发布、未使用部署令牌。
- 隔离Chrome与WebKit：320px、所有文字放大到200%，没有横向溢出，能连续滚到底；输入页与结果页0/3提示可见，合成1/3记录可显示，更新失败保留原记录并有提示，更新只GET规则，按钮可聚焦并用Enter操作。行程填入上海虹桥→杭州东，结果仍保留至少12条行动。浏览器错误0。报告`tmp/A-qa/report.json`，顶部/底部截图在同目录。
- 官网检查：Agent Reach公开网页读取国航服务页成功；本地`--check`只读比较铁路、国航辅助设备匹配，国航电池摘录未全部命中，返回退出码1（安全拒绝，不是验收脚本崩溃）。没有为匹配的两条填写人工审核人，也没有写入或批准生产记录。日志`tmp/A-live-rule-check.log`。
- 线上只读复核：2026-11-17，HTTP200，仍为3条unverified、checkedAt/expiresAt=null；这是原线上状态，本批未上传。记录`tmp/A-online-rules.json`。

人工待验：真人读屏；iOS Safari与安卓微信真机；人工完整阅读官方条款并解释电池摘录不匹配原因；真实承运方答复。桌面WebKit不等同iOS真机，合成批准不等于人工核验。A批实现与本地检查完成；B–E尚未开始。本地通过不等于线上同步。

## 回滚点

改前副本：`.work-checkpoints/20261117-P0-P1/A-before/manifest.json`；补充的TravelQuery改前副本在同级`A-extra-before/src/features/TravelQuery.tsx`。按清单逐文件恢复A批文件；新增文件另行移除。不得重置全仓库或覆盖后续批次改动。生产人工核查文件及用户数据未修改，未创建令牌、未发布创空间。
