# 无防火墙限制时可用
rsync -rtzvlC --exclude upload --exclude public_dist --exclude node_modules --exclude '.git' ./ "root@211.159.157.171":"/data/www/club"

#有防火墙限制时
pscp -r dir ../club root@211.159.157.171:/data/www/

