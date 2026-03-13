#!/bin/bash

# Nginx故障排查脚本

echo "=========================================="
echo "Nginx故障排查"
echo "=========================================="

# 1. 查看Nginx错误日志
echo -e "\n[1] 查看Nginx错误日志（最近20行）:"
echo "----------------------------------------"
sudo tail -n 20 /var/log/nginx/error.log

# 2. 查看systemd日志
echo -e "\n[2] 查看systemd日志（最近20行）:"
echo "----------------------------------------"
sudo journalctl -xeu nginx.service --no-pager | tail -n 20

# 3. 检查端口占用
echo -e "\n[3] 检查5678端口占用情况:"
echo "----------------------------------------"
sudo netstat -tlnp | grep 5678 || echo "端口5678未被占用"
sudo ss -tlnp | grep 5678 || echo "端口5678未被占用"

# 4. 检查Nginx配置
echo -e "\n[4] 测试Nginx配置:"
echo "----------------------------------------"
sudo nginx -t

# 5. 检查Nginx进程
echo -e "\n[5] 检查Nginx进程:"
echo "----------------------------------------"
ps aux | grep nginx | grep -v grep || echo "没有Nginx进程运行"

# 6. 检查配置文件
echo -e "\n[6] 检查配置文件内容:"
echo "----------------------------------------"
if [ -f /etc/nginx/sites-available/file-storage ]; then
    echo "配置文件存在: /etc/nginx/sites-available/file-storage"
    echo "前20行内容:"
    head -n 20 /etc/nginx/sites-available/file-storage
else
    echo "配置文件不存在"
fi

# 7. 检查软链接
echo -e "\n[7] 检查软链接:"
echo "----------------------------------------"
ls -la /etc/nginx/sites-enabled/ | grep file-storage || echo "软链接不存在"

# 8. 检查Nginx主配置
echo -e "\n[8] 检查Nginx主配置中的include:"
echo "----------------------------------------"
grep -n "sites-enabled" /etc/nginx/nginx.conf || echo "未找到sites-enabled配置"

echo -e "\n=========================================="
echo "排查完成"
echo "=========================================="
