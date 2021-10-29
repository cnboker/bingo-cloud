### reset databse for test

* remove all files from migrations folder
* dotnet ef database drop -f -v
* dotnet ef migrations add Initial
* dotnet ef database update

