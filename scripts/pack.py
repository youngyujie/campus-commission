# 打「校园委托」提交包：单文件应用 + 源码 + 文档 + 截图
# 用法：python scripts/pack.py
import os
import zipfile
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = f"校园委托-提交包-{date.today().isoformat()}.zip"
OUT = os.path.join(ROOT, NAME)

README_TXT = """校园委托 · 提交包说明
================================

【最快看效果】双击 01-双击体验.html
    单个 HTML 文件，双击就能打开完整应用（手机浏览器 / 桌面浏览器都行）。
    不需要装任何环境、不需要联网、不需要起服务器。
    建议按 F12 打开开发者工具，切到手机视图（iPhone 12 / 390x844）看效果。

【演示账号】登录页底部有三个一键登录入口，点一下直接进：
    2023010101 / 123456    学生 林小满
    2022010202 / 123456    学生 陈子昂
    admin       / admin888 管理员 张老师
    其他学生账号（密码都是 123456）：
    2024010303 苏晴 / 2021010404 周野 / 2023020505 何知微

【看源码】02-源码 文件夹
    技术栈：uni-app + Vue 3 + Vite
    本地跑起来：
        cd 02-源码
        npm install
        npm run dev:h5          # 浏览器预览，地址 http://127.0.0.1:5180
        npm run build:single    # 重新生成单文件版

    自动化验证（需先启动 dev:h5）：
        node scripts/shots.js   # 全站 17 页截图 + 错误收集
        node scripts/flow2.js   # 全链路 18 项断言

【文档】README.md 是完整说明（定位 / 功能清单 / 状态机 / 信用分规则 /
        技术选型 / 目录结构 / 运行方式 / 2 分钟演示脚本 / 已知限制）。
        HANDOFF.md 是开发交接记录，含踩过的坑，团队协作时可参考。

【截图】03-截图 文件夹，17 张页面截图。

功能概览
--------------------------------
· 校园身份核验：学号 + 真实姓名 + 校园邮箱三重校验
· 委托人：发单、看报价、挑服务商、验收、评价、取消、申诉
· 服务商：大厅筛选、报价、接单、交付、作品集、收藏
· 消息：订单私聊（文字 + 图片）+ 系统通知 + 未读红点
· 信用：完成 +2 / 好评 +3 / 差评 -3 / 取消 -2 / 违约 -5，低于 60 限制交易
· 管理后台：数据概览、委托审核、用户封禁、申诉仲裁、分类管理、公告发布
· 风控：代考代写类违规词发布前置拦截 + 管理员审核二次把关

重要说明
--------------------------------
数据存在浏览器本地存储（localStorage）。
同一台设备、同一个浏览器里所有账号数据打通，可以完整演示双角色闭环；
换设备或换浏览器数据不共享，这不是一个真正的多用户线上系统。
要做成真多人使用需要接后端，业务逻辑已全部收敛在 src/utils/store.js，
替换数据层即可迁移，页面基本不用改。
"""


def add_dir(zf, src_dir, arc_prefix):
    count = 0
    for base, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "__pycache__", "dist", "fixtures")]
        for f in files:
            full = os.path.join(base, f)
            rel = os.path.relpath(full, src_dir)
            zf.write(full, os.path.join(arc_prefix, rel).replace("\\", "/"))
            count += 1
    return count


def main():
    if os.path.exists(OUT):
        os.remove(OUT)

    total = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.writestr("使用说明.txt", README_TXT)

        single = os.path.join(ROOT, "校园委托-单文件版.html")
        if os.path.exists(single):
            zf.write(single, "01-双击体验.html")
            total += 1
        else:
            print("警告：单文件版不存在，先跑 npm run build:single")

        src_items = [
            "src",
            "scripts",
            "index.html",
            "package.json",
            "package-lock.json",
            "vite.config.js",
        ]
        for item in src_items:
            full = os.path.join(ROOT, item)
            if os.path.isdir(full):
                total += add_dir(zf, full, os.path.join("02-源码", item))
            elif os.path.isfile(full):
                zf.write(full, os.path.join("02-源码", item).replace("\\", "/"))
                total += 1

        prev = os.path.join(ROOT, "preview")
        if os.path.isdir(prev):
            total += add_dir(zf, prev, "03-截图")

        for doc in ["README.md", "HANDOFF.md"]:
            p = os.path.join(ROOT, doc)
            if os.path.isfile(p):
                zf.write(p, doc)
                total += 1

    size = os.path.getsize(OUT) / 1024
    print(f"OK 已生成: {OUT}")
    print(f"   文件数: {total}   大小: {size:.0f} KB")


if __name__ == "__main__":
    main()
