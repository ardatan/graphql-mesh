Run this docker container;

```sh
docker run -d \
  --name mysql-employees \
  -p 33306:3306 \
  -e MYSQL_ROOT_PASSWORD=passwd \
  -v $PWD/data:/var/lib/mysql \
  genschsa/mysql-employees
```
