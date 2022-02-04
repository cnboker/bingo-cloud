# DataCrawer


*  *  *  *  *  *
┬ ┬ ┬ ┬ ┬ ┬
│ │ │ │ │  |
│ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
│ │ │ │ └───── month (1 - 12)
│ │ │ └────────── day of month (1 - 31)
│ │ └─────────────── hour (0 - 23)
│ └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)

　　6个占位符从左到右分别代表：秒、分、时、日、月、周几

　　'*'表示通配符，匹配任意，当秒是'*'时，表示任意秒数都触发，其它类推

　　下面可以看看以下传入参数分别代表的意思

每分钟的第30秒触发： '30 * * * * *'

每小时的1分30秒触发 ：'30 1 * * * *'

每天的凌晨1点1分30秒触发 ：'30 1 1 * * *'

每月的1日1点1分30秒触发 ：'30 1 1 1 * *'

2016年的1月1日1点1分30秒触发 ：'30 1 1 1 2016 *'

每周1的1点1分30秒触发 ：'30 1 1 * * 1'

*/5 * * * * * - runs every 5 seconds
*/10 * * * * - runs every 10 minutes
0 6-20/2 * * 1-5 - runs every second hour between 6AM and 8PM on weekdays (Monday through Friday)
5 4 * * SUN - runs at 4:05 on every Sunday

属性selector指南
https://css-tricks.com/attribute-selectors/

单独测试
jest -t '/fullpath/testfile' 