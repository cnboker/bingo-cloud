flush privileges;
update user set host='%' where user='root';
GRANT ALL ON *.* TO 'root'@'%';
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'ROO#2022';
flush privileges; 