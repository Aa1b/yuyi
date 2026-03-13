#!/bin/bash

# 快速修复Nginx端口冲突

echo "正在修复Nginx端口冲突..."

# 1. 停止Nginx
sudo systemctl stop nginx 2>/dev/null || true

# 2. 禁用default配置（如果存在）
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "禁用default配置..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# 3. 确保只有我们的配置启用
echo "检查启用的配置..."
ls -la /etc/nginx/sites-enabled/

# 4. 测试配置
echo "测试Nginx配置..."
if sudo nginx -t; then
    echo "✓ 配置测试通过"
    
    # 5. 重新加载systemd
    sudo systemctl daemon-reload
    
    # 6. 启动Nginx
    echo "启动Nginx..."
    if sudo systemctl start nginx; then
        sleep 2
        if sudo systemctl is-active --quiet nginx; then
            echo "✓ Nginx启动成功！"
            echo ""
            echo "测试文件服务:"
            echo "curl http://149.104.29.197:5678/health"
        else
            echo "❌ Nginx启动失败，查看日志:"
            sudo tail -n 20 /var/log/nginx/error.log
        fi
    else
        echo "❌ Nginx启动命令失败"
        sudo systemctl status nginx
    fi
else
    echo "❌ 配置测试失败，请检查配置文件"
    exit 1
fi
