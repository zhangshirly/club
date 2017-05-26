# 无防火墙限制时可用
rsync -rtzvlC --exclude upload --exclude public_dist --exclude node_modules --exclude '.git' ./ "root@211.159.157.171":"/data/www/club"

#有防火墙限制时 整个项目部署
pscp -r ../club root@211.159.157.171:/data/www/


# 部分常改动文件部署
pscp -r package.json windows_deploy.bat app.js gulpfile.js gulpfile2.js server source public test root@211.159.157.171:/data/www/club/

# 只部署配置文件

pscp -r server/config.js root@211.159.157.171:/data/www/club/server/
