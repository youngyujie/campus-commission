# 打「后端服务包」
# 关键：shell 脚本进包前必须转成 LF，否则 Linux 上会报 `set: Illegal option -`
import io
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRV = os.path.join(ROOT, 'server')
OUT = os.path.join(ROOT, '校园委托-后端服务包.zip')

FILES = [
    'server.js',
    'make-admin.js',
    'package.json',
    '启动.bat',
    'start.sh',
    'deploy.sh',
    '说明.md',
    '部署到云服务器.md'
]

# 这些扩展名必须是 LF
LF_EXT = ('.sh', '.js', '.json', '.md')

README = """校园委托 · 后端服务包
====================

【更新到服务器】
WinSCP 把 server 文件夹覆盖到 /home/ubuntu/，然后：
   cd ~/server && sh deploy.sh
deploy.sh 不会覆盖服务器上已有的 data.json。

【登录方式】
只有一种：手机号 + 密码
演示账号（登录页底部，点一下直接进）：
  13800000001 / 123456   林小满
  13800000006 / 123456   许一帆
  13800000000 / admin888 张老师（管理员）

【本地试跑】
Windows 双击 server\\启动.bat；Mac/Linux 执行 node server.js
终端会打印访问口令，用它打开 http://localhost:3000/?key=口令

【对所有人开放（不要口令）】
echo "off" | sudo tee /opt/campus-commission/access-key.txt
sudo systemctl restart campus
之后直接访问 http://你的IP:3000/ ，不需要 ?key=
想恢复口令：把 access-key.txt 内容改回任意口令，或删掉它重启（会重新生成）

【把自己设成管理员】
cd ~/server
node make-admin.js 你的手机号
sudo systemctl restart campus

【权限模型】
· 访问口令 + 登录会话，只下发这个人该看的
· 别人的手机号、学号、余额、聊天、通知拿不到
· 委托大厅公开；管理员全见，但密码永不下发
· 写入和删除都验归属；单次删超过 15 条整批拒绝
· 重复注册会被拒

【三道防误删】
归属校验 / 删除熔断 / 每日 03:00 自动备份（留 30 份）

【数据在哪】
/opt/campus-commission/data.json
恢复备份：
  sudo cp /opt/campus-commission/backups/YYYYMMDD-HHMM.json /opt/campus-commission/data.json
  sudo systemctl restart campus

【常用命令】
sudo systemctl status campus
sudo systemctl restart campus
sudo journalctl -u campus -n 50 --no-pager
"""


def main():
    if os.path.exists(OUT):
        os.remove(OUT)

    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.writestr('使用说明.txt', README.replace('\n', '\r\n'))

        for name in FILES:
            src = os.path.join(SRV, name)
            data = io.open(src, 'rb').read()
            if name.lower().endswith(LF_EXT):
                data = data.replace(b'\r\n', b'\n')
            zf.writestr('server/' + name, data)

        # 网页本体
        html = os.path.join(SRV, 'public', 'index.html')
        zf.write(html, 'server/public/index.html')

    size = os.path.getsize(OUT) // 1024
    print('已打包 %s  %d KB' % (OUT, size))
    with zipfile.ZipFile(OUT) as z:
        for n in z.namelist():
            print('  -', n, z.getinfo(n).file_size // 1024, 'KB')


if __name__ == '__main__':
    main()
