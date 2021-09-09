drop table mailMessage;
create table if not exists mailMessage (
  id int not null AUTO_INCREMENT PRIMARY KEY,
  emailAddress varchar(50) not null,
  title varchar (255) not null,
  createDateTime timestamp default current_timestamp,
  status TINYINT,
  tryCount TINYINT,
  templateId varchar(50),
  parameter1 varchar (50),
  parameter2 varchar (50),
  parameter3 varchar (50),
  parameter4 varchar (50)
) engine = innodb;