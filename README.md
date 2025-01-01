# jellyfin-danmaku-mini

## Jellyfin弹幕插件-Mini

![image](/Simple.png)

## 功能

> 请注意Readme上方截图可能与最新版存在差异,请以实际版本与说明为准
> 
> 请注意此版本为Mini版,功能比上游版本更少

左下方新增如下按钮,若按钮透明度与"暂停"等其他原始按钮存在差异,说明插件正在进行加载

- 弹幕开关: 切换弹幕显示/隐藏状态
- 搜索弹幕: 手动输入信息匹配弹幕
- 增加弹幕源: 手动添加自定义弹幕源（用于番剧刚发布，弹弹Play还未收录弹幕源地址时使用，如果已经登录，则会提交给弹弹Play）
- 弹幕设置:
  - 设置弹幕透明度 [0, 1]
  - 设置弹幕速度 [20, 600]
  - 设置弹幕字体大小 [8, 80]
  - 设置弹幕区域占屏幕的高度比例 [0, 1]
  - 弹幕密度: 依据水平和垂直密度过滤, 弹幕0级无限制*
  - 设置弹幕用户名过滤,支持选项: 哔哩哔哩, 巴哈姆特, 弹弹Play, 其他
  - 设置弹幕类型过滤,支持：底部，顶部，滚动
  - 简繁转换: 在原始弹幕/简体中文/繁体中文3种模式切换
  - 是否使用本地XML弹幕
  - 当前集数弹幕偏移时间
- 日志开关: 开启/关闭调试日志输出
- 发送弹幕: 登录弹弹Play，并在播放界面发送弹幕

 **除0级外均带有每3秒6条的垂直方向弹幕密度限制,高于该限制密度的顶部/底部弹幕将会被转为普通弹幕*

## 支持的客户端

- Jellyfin Web
- Jellyfin Android (播放器类型仅限网页播放器)
- Jellyfin iOS

## 弹幕

弹幕来源为 [弹弹 play](https://www.dandanplay.com/) ,已开启弹幕聚合(Acfun/Bili/Tucao/Baha/5DM/iQIYI等不知名网站弹幕融合)

**在启用了`使用本地xml弹幕`后，会尝试调用[cxfksword/jellyfin-plugin-danmu](https://github.com/cxfksword/jellyfin-plugin-danmu)的API获取其预先下载好的xml弹幕，绕过弹弹play的弹幕查询和加载**

## 数据

匹配完成后对应关系会保存在**浏览器(或客户端)本地存储**中,后续播放(包括同季的其他集)会优先按照保存的匹配记录载入弹幕

## 安装

**注：** 安装完首次使用时，确保只有当前一个客户端访问服务器，以方便根据当前用户id获取Session时能唯一定位到当前客户端设备id。（主要是由于非Jellyfin Web客户端没有默认在localstorage中存储DeviceID）

### 1. 修改脚本(可选)

按需求修改脚本中的corsProxy和isLocalCors 
当 `isLocalCors = true` 时 `corsProxy = $jellyfin域名`

### 2. 对网页植入JS & 自建反向代理(可选)

参照[上游jellyfin-danmaku](https://github.com/Izumiko/jellyfin-danmaku)的安装方法即可

## 常见弹幕加载错误/失败原因

1. 译名导致的异常: 如『よふかしのうた』 Emby 识别为《彻夜之歌》后因为弹弹 play 中为《夜曲》导致无法匹配
2. 存在多季/剧场版/OVA 等导致的异常: 如『OVERLORD』第四季若使用S[N]格式归档(如OVERLORD/S4E1.mkv或OVERLORD/S4/E1.mkv),可能出现匹配失败/错误等现象
3. 其他加载BUG: ~~鉴定为后端程序猿不会前端还要硬写JS~~,有BUG麻烦 [开个issue](https://github.com/Izumiko/jellyfin-danmaku/issues/new/choose) THX

> 首次播放时请检查当前弹幕信息是否正确匹配,若匹配错误请尝试手动匹配

## 鸣谢

感谢JetBrains [OpenSourceSupport](https://jb.gg/OpenSourceSupport)所提供的支持

![JetBrains Logo (Main) logo](https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.svg)

[![Stargazers over time](https://starchart.cc/Izumiko/jellyfin-danmaku.svg)](https://starchart.cc/Izumiko/jellyfin-danmaku)
