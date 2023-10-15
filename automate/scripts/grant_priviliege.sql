-- flush privileges;
-- use mysql;
-- update user set host='%' where user='root';
-- GRANT ALL ON *.* TO 'root'@'%';
-- ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'ROO#2022';
-- flush privileges; 

CREATE USER 'mysql.infoschema'@'localhost' IDENTIFIED BY 'password';
update user set select_priv='Y' where user='mysql.infoschema';
flush privileges; 