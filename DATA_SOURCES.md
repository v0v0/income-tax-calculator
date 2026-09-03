# 城市政策数据快照与核验说明

快照日期：**2026-09-03**

## 数据使用方式

本项目不是运行时爬虫。维护时查阅公开政策并把结果固化到 `data/city-policies.json`，GitHub Pages 只读取静态文件。

按产品要求，计算器采用 **当前政策快照 × 12个月**：即使某项新标准在年中生效，也不把自然年拆段。这是为了比较“当前工资条件下的年化收入”，不是复原历史工资单。

状态：

- `current`：已核验到 2026 当前公开值。
- `temporary`：官方当前暂行/过渡口径。
- `reference`：2026 新值尚未完整核验，使用最近一期公开参考值。

公积金若当地只规定比例区间，数据中的 `defaultPersonalRate/defaultEmployerRate` 是**计算器预设**，不是当地统一强制比例；页面允许用户分别自定义公司和个人比例。

## 个税政策来源

### 全年一次性奖金

财政部、税务总局公告 2023 年第 30 号：

https://fgk.chinatax.gov.cn/zcfgk/c102416/c5211524/content.html

居民个人全年一次性奖金可单独计税，也可并入综合所得；政策执行至 2027-12-31。

### “一老一小”专项附加扣除

国务院国发〔2023〕13号：

https://app.www.gov.cn/govdata/gov/202308/31/506746/article.html

采用：3岁以下婴幼儿照护 2000 元/月/人、子女教育 2000 元/月/人、赡养老人 3000 元/月总额度。非独生子女应按本人实际分摊额手工修改。

### 个人养老金

财政部、税务总局公告 2024 年第 21 号：

https://fgk.chinatax.gov.cn/zcfgk/c102416/c5237110/content.html

缴费环节据实扣除，年度限额 12000 元。

## 代表性城市 / 区域核验来源

### 北京

2026 社保基数 7270–36348：
https://www.beijing.gov.cn/zhengce/zhengcefagui/202608/t20260821_4831679.html

2026 公积金基数 2540–36348、比例 5%–12%：
https://www.beijing.gov.cn/fwcj/jiage/zffw1/685cd52595ff563574309b82.html

### 上海

2026 社保基数 7546–37731：
https://rsj.sh.gov.cn/tdjjf_17554/20260824/t0035_1443297.html

2026 公积金快照 2740–37731，常规比例 5%/6%/7%：
https://m.sh.bendibao.com/zffw/308515.html

### 江苏：苏州 / 南京 / 无锡等

江苏企业职工主要个人费率参考（养老8%、医疗2%、失业0.5%，工伤/生育个人不缴）：
https://jiangsu.chinatax.gov.cn/art/2026/4/14/art_21737_921.html

苏州 2026 公积金上限 40600、单位和个人各 5%–12%：
https://www.suzhou.gov.cn/szsrmzf/bmwj/202607/4ebad3bfb66a40a09eb0997a93899cd2.shtml

南京 2026 公积金 2660–42400：
https://gjj.nanjing.gov.cn/zwgk/tzgg/202607/t20260717_5878580.html

无锡 2026 公积金 2490–36800：
https://bigdata.wuxi.gov.cn/doc/2026/08/07/4815587.shtml

南通当前公积金页面：
https://nt.bendibao.com/live/2014718/38104.shtm

### 杭州

2026 公积金 2660–42151，单位比例 5%–12%：
https://hznews.hangzhou.com.cn/jingji/content/2026-07/25/content_9263759.htm

### 合肥

2026 公积金上限 31564、比例 5%–12%，下限按最低工资：
https://m.thepaper.cn/newsDetail_forward_33482220

### 西安

2026 职工医保基数 5132–25660：
https://m.xa.bendibao.com/news/152465.shtm?src=amap

### 大连

2026-2027 公积金上限 31929，下限按大连 2025 年最低工资：
https://ep.bdcb.cn/shtml/bdcb/20260713/20260713A021.html

大连当前月最低工资 2230：
https://rst.ln.gov.cn/eportal/ui?msgDataId=bd2db87abc8b48ea92024c66e8deade7&pageId=ab4555d39b8b4d06a3c48b4319b3801e

### 山东

山东失业保险个人费率 0.3%：
https://jnhrss.jinan.gov.cn/col65788/art/2023/art_65788_4793431.html

烟台官方 2026 问答确认企业职工养老个人 8%、失业个人 0.3%、工伤个人 0：
https://rshj.yantai.gov.cn/col/col110406/art/2026/art_e90258b46a4147789adda92d69d38411.html

## 后续更新原则

1. 优先把 `reference` 城市替换成当地人社/税务/医保/公积金官方 2026 文件。
2. 正式年度社保上下限发布后，把 `temporary` 状态切换为 `current`。
3. 当地公积金只有比例区间时，保留区间并继续把默认值描述为“计算器预设”。
4. 更新时同步修改 `snapshotDate`。

## 重要限制

- 实际社保/公积金申报基数通常与职工上一年度月平均工资相关，不一定等于当前月薪。
- 各单位公积金实际缴存比例可能不同。
- 部分城市医疗保险存在固定个人附加额或独立缴费基数。
- `reference` 行用于估算，不应被解释为正式新年度标准。
- 最终应以工资单和当地主管部门实际执行为准。
