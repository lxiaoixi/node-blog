[toc]

# node 使用redis集群

## redis集群部署

> 要让集群正常工作至少需要3个主节点，在这里我们要创建6个redis节点，其中三个为主节点，三个为从节点，对应的redis节点的ip和端口对应关系如下（为了简单演示都在同一台机器上面）。

```
127.0.0.1:7000
127.0.0.1:7001
127.0.0.1:7002
127.0.0.1:7003
127.0.0.1:7004
127.0.0.1:7005
```

### 安装和启动Redis

1. 环境：

* redis: 5.0.6
* linux: Ubuntu 16.04

2. 安装redis
> 此处使用Ubuntu，根据自己的系统安装redis。Ubuntu 16.04 默认源中的 Redis 版本是3.0版本，不是最新版，要想通过 apt-get install 的方式安装最新版，首先添加 Redis 源。安装方式如下：
```
// 安装依赖
sudo apt-get install software-properties-common -y
// 添加 Redis 镜像源
sudo add-apt-repository ppa:chris-lea/redis-server -y
// 安装redis
sudo apt-get update && sudo apt-get install redis-server -y
// 查看redis版本
redis-server -v
// 启动redis
sudo service redis-server start
// 查看进程启动情况
ps ps -ef | grep redis
// 连接redis
redis-cli
```

### 搭建集群
> 在2中redis安装成功后，`redis`配置文件文件在`/etc/redis`目录下，`redis`服务程序`redis-server`,还有用于测试的客户端程序`redis-cli`会安装在`/usr/bin` 目录下。

* 创建集群配置目录, 集群配置目录放在`redis`服务程序`redis-server`的上级目录usr里

```
cd /usr
mkdir cluster
cd cluster
mkdir 7000 7001 7002 7003 7004 7005
```

* 复制redis的配置文件
将redis的配置文件复制到对应端口文件夹下,6个文件夹都要复制一份
```
cd /etc/redis
sudo cp redis.conf /usr/cluster/7000/redis.conf
```
* 修改集群的配置文件redis.conf，将下面的选项修改
```
# 端口号
port 7000
# 后台启动
daemonize yes
# 开启集群
cluster-enabled yes
#集群节点配置文件
cluster-config-file nodes-7000.conf
# 集群连接超时时间
cluster-node-timeout 5000
# 进程pid的文件位置
pidfile /var/run/redis-7000.pid
# 开启aof
appendonly yes
# aof文件路径
appendfilename "appendonly-7005.aof"
# rdb文件路径
dbfilename dump-7000.rdb
```

* 创建启动脚本

在`/usr`目录下创建一个`start.sh`

```
#!/bin/bash
bin/redis-server cluster/7000/redis.conf
bin/redis-server cluster/7001/redis.conf
bin/redis-server cluster/7002/redis.conf
bin/redis-server cluster/7003/redis.conf
bin/redis-server cluster/7004/redis.conf
bin/redis-server cluster/7005/redis.conf
```

* 启动脚本`start.sh`

```
sudo bash start.sh
```

* 查看一下进程看启动情况
```
ps -ef | grep redis

进程状态如下：

redis      665     1  0 Oct23 ?        00:00:33 /usr/bin/redis-server 127.0.0.1:6379
root      1386     1  0 Oct23 ?        00:00:43 bin/redis-server 127.0.0.1:7000 [cluster]
root      1388     1  0 Oct23 ?        00:00:43 bin/redis-server 127.0.0.1:7001 [cluster]
root      1393     1  0 Oct23 ?        00:00:43 bin/redis-server 127.0.0.1:7002 [cluster]
root      1398     1  0 Oct23 ?        00:00:50 bin/redis-server 127.0.0.1:7003 [cluster]
root      1403     1  0 Oct23 ?        00:00:50 bin/redis-server 127.0.0.1:7004 [cluster]
root      1408     1  0 Oct23 ?        00:00:50 bin/redis-server 127.0.0.1:7005 [cluster]
coding    3180  2625  0 10:42 pts/1    00:00:00 grep --color=auto --exclude-dir=.bzr --exclude-dir=CVS --exclude-dir=.git --exclude-dir=.hg --exclude-dir=.svn redis

有6个redis进程在开启，说明我们的redis就启动成功了
```

### 开启集群

> 以上我们只是开启了6个redis进程而已，它们都还只是独立的状态，还么有组成集群。我们需要将6个redis进程组成集群。`Redis`的版本是`3.x`或`4.x`，需要使用一个叫做`redis-trib`的工具，而对于`Redis5.0`之后的版本，`Redis Cluster`的命令已经集成到了`redis-cli`中了。我用的是`Redis5`，所以没有再单独安装`redis-trib`工具。
如果使用`redis-trib`可参考https://www.jianshu.com/p/c869feb5581d

* 创建集群
> `redis` 创建集群时，按照从主到从的方式从左到右依次排列6个`redis`节点。集群创建成功后，redis会将16384个哈希槽分配到3个主节点，即7000,7001,7002，然后将各个从节点7003,7004,7005指向主节点，进行数据同步。

```
创建集群
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 --cluster-replicas 1

当看到输出了
[OK] All 16384 slots covered
就表示Redis Cluster已经创建成功了。
```

* 使用`cluster nodes`查看集群节点信息

```
redis-cli -p 7000 cluster nodes

节点信息如下：

f737cc9c9df8a4878849eed6aea2ab143ef8f17d 127.0.0.1:7005@17005 slave c4a95f3b76d051be5a334ce88f528d0343ef622d 0 1571885561000 6 connected
db8f7c076c5ab7cd92b270c56b9ffbddc143521b 127.0.0.1:7001@17001 master - 0 1571885559557 2 connected 5461-10922
650d5b2a0c5c5cc3bfe24872b5b9e9221ab9bc28 127.0.0.1:7004@17004 slave db8f7c076c5ab7cd92b270c56b9ffbddc143521b 0 1571885561063 5 connected
c4a95f3b76d051be5a334ce88f528d0343ef622d 127.0.0.1:7002@17002 master - 0 1571885560000 3 connected 10923-16383
ec0467d9bba4a8f8f5f56c3c236635ac2672b883 127.0.0.1:7003@17003 slave a52ab62b3bd5b805dd8cd5b29e7f8822f9b9a849 0 1571885560862 4 connected
a52ab62b3bd5b805dd8cd5b29e7f8822f9b9a849 127.0.0.1:7000@17000 myself,master - 0 1571885559000 1 connected 0-5460
```

### 连接集群

> 在上面我们以及搭建完redis集群了。
我们使用`reids-cli`连接集群，使用时加上`-c`参数，就可以连接到集群。

```
redis-cli -c -p 7001
127.0.0.1:7001> set username xiaoxi
-> Redirected to slot [14315] located at 127.0.0.1:7002
OK
127.0.0.1:7002> get username
"xiaoxi"
127.0.0.1:7002>
```

上面我们以集群的方式连接到节点7001上，我们插入一个key值username，该key值使用CRC16算法，这里将key分配到了7002节点上，Redirected to slot [14315] located at 127.0.0.1:7002，
redis cluster也直接跳转到了7002节点上。在7002节点上，直接获取key对应的值。

至此我们redis集群已经全部搭建完。

### redis集群还可以新增/删除一个主节点/从节点及迁移solt分配哈希槽，可自行查询。

## node使用ioredis插件使用集群

```
var Redis = require("ioredis");
 
var cluster = new Redis.Cluster([
  {
    port: 7000,
    host: "127.0.0.1"
  },
  {
    port: 7001,
    host: "127.0.0.1"
  },
  {
    port: 7002,
    host: "127.0.0.1"
  },
  {
    port: 7003,
    host: "127.0.0.1"
  },
  {
    port: 7004,
    host: "127.0.0.1"
  },
  {
    port: 7005,
    host: "127.0.0.1"
  }
]);

async function set(key,value){
  await cluster.set(key,value);
}

async function get(key){
  return await cluster.get(key);
}

set('callinfo', 88)
get('callinfo').then(function(result){
  console.log(result)
})
```

## redis集群功能限制

* key 批量操作 支持有限。

类似 `mset、mget` 操作，目前只支持对具有相同 `slot` 值的 `key` 执行 批量操作。对于 映射为不同 `slot` 值的 `key` 由于执行 `mget`、`mget` 等操作可能存在于多个节点上，因此不被支持。

* key 事务操作 支持有限。

只支持 多 `key` 在 同一节点上 的 事务操作，当多个 `key` 分布在 不同 的节点上时 无法 使用事务功能。

* `key` 作为 数据分区 的最小粒度

不能将一个 大的键值 对象如 `hash`、`list` 等映射到 不同的节点。

* 不支持 多数据库空间

单机 下的 `Redis` 可以支持 16 个数据库（db0 ~ db15），集群模式 下只能使用 一个 数据库空间，即 db0。

* 复制结构 只支持一层

从节点 只能复制 主节点，不支持 嵌套树状复制 结构。


## redis集群原理

参考：

* https://www.jianshu.com/p/c869feb5581d
* https://juejin.im/post/5c1bb40a6fb9a049f36211b0
