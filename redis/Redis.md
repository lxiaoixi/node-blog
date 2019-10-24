# Redis

## 基础数据类型

### string 字符串 

> 最基本的数据类型，可接受任何格式的二进制数据，如：图片、Json格式字符串，最大数据长度512MB.

* 数据模型<br>
    Key-value<br>
    "name":"jeff"
* 应用场景
    数据访问频率高，不经常变动  如：APP商品分类栏<br>
    Key - Value<br>
    "category"-{"女装","男装","儿童装"}

> 其中 value 为 一个JSON格式的字符串

### hash-对象

> hash 的key是个唯一值，Value部分是个hashmap结构.

* 数据模型<br>
    Key-Value<br>
    "用户id"-{"name":"jeff","age":"10"}
* 应用场景<br>
    根据用户id获取用户信息。

> 一般对象的存储用hash数据类型，若用string存储会产生JSON/反JSON的开销

### List-队列(消息队列)-先进先出

> list 是按照插入顺序排序的字符串链表，可在头部和尾部插入新的元素，若Key不存在，会为该Key创建一个新的链表，若链表中所有元素被移除，该Key也会被移除.

* 应用场景<br>
消息队列 ，如发送短信功能，使用队列实现异步操作

### Set-集合(无序不重复)

> 可在该类型上添加、删除元素或者判断某一元素是否存在
用户需要存储很多数据，但又不希望出现重复的数据。
提供聚合运算。Value是一系列不重复的数据集合。

* 应用场景<br>
如 两个人的共同好友
在redis中 把用户a的好友存储在集合a中，把用户b的好友存储在集合b中，通过求两个集合的交集，就能获取出两人的共同好友

### Zset-集合(有序不重复,分数Score排序)

> 和set类似，主要区别是其提供了一个分数score与每一个成员对应，Redis根据score对成员进行排序.

* 应用场景<br>
适用于各种类型的排行榜。如：学生成绩

## Pipelining 管道 redis.pipeline()

> 批量执行命令。send a batch of commands (e.g. > 5), you can use pipelining to queue the commands in memory and then send them to Redis all at once. 

```
redis.pipeline().set('foo', 'bar').get('foo').exec()
```

## Transaction 事务 multi

> redis.multi() 用于Redis的事务控制，一个语句出错，整个操作回滚。

```
redis.multi().set('foo', 'bar').get('foo').exec()s
```

## Sentinel 哨兵机制 

> 主从复制。a master and one or more slaves。当master发生错误宕机后，redis会从Sentinels中请求一个slave，将其提升为master进行连接，原来的master会降级为slave。

```
var redis = new Redis({
    sentinels: [{ host: 'localhost', port: 26379 }, { host: 'localhost', port: 26380 }],
    name: 'mymaster'
});
```

## Cluster 集群，多结点 

> Redis Cluster provides a way to run a Redis installation where data is automatically sharded across multiple Redis nodes。

```
var cluster = new Redis.Cluster([{
  port: 6380,
  host: '127.0.0.1'
}, {
  port: 6381,
  host: '127.0.0.1'
}]);
 
cluster.set('foo', 'bar');
```

## Read - write splitting 读写分离

> 典型的redis集群包含3个或更多主数据库(master),每个master又有多个从数据库(slaves),读写分离一般为主数据库用来进行写操作，从数据库用来进行查询操作。通过设置scaleReads 参数，来决定读写方式。

## PUB / SUB 订阅发布

> redis 可以通过订阅信道(channel)来获取其它客户端在该信道发布的消息。

## 分布式锁

> 分布式锁 本质是在redis里面占一个坑，当别的进程也要来占时，发现已经有人蹲在那里了，就只好放弃或者稍后再试。<br>
使用setnx命令（创建如果不存在），只允许被一个客户端占坑。先来先占， 用完了，再调用 del 指令释放茅坑。

实现过程：

1. setnx lock: key true // 其它进程发现该锁已经存在时就不会执行
2. expire lock: key 5 //若在 1 后因停电或机器故障导致2没执行，也会产生死锁
3. do something // 如果2中不设置过期时间，此处出现异常会导致4不执行，锁就没法删除，会导致死锁
4. del lock: key // 结束后删除锁

> 因为setnx和expire并不是原子性的，会导致死锁的产生
所以使用set的扩展参数将1和2合并实现原子操作： set lock: codehole true ex 5 nx

解决方案：

1. set lock: codehole true ex 5 nx
2. do something...
3. del lock: key

> Redis 分布式锁不要用于较长时间的任务。时间较长可能会导致中间逻辑还没执行完redis锁就过期,导致逻辑错误

## 消息队列 - list

> Redis 的 list(列表) 数据结构常用来作为异步消息队列使用，使用rpush/lpush操作入队列，使用lpop 和 rpop来出队列。<br>客户端是通过队列的 pop 操作来获取消息，然后进行处理。处理完了再接着获取消息，再进行处理。如此循环往复，这便是作为队列消费者的客户端的生命周期。

问题：
> 如果队列空了，客户端就会陷入 pop 的死循环，不停地 pop，没有数据，接着再 pop，又没有数据。这就是浪费生命的空轮询。空轮询不但拉高了客户端的 CPU，redis 的 QPS 也会被拉高，如果这样空轮询的客户端有几十来个，Redis 的慢查询可能会显著增多。

解决方案：

> 阻塞读-使用blpop/brpop替代前面的lpop/rpop。在队列没有数据的时候，会立即进入休眠状态，一旦数据到来，则立刻醒过来。

问题：
空闲连接时会自动断开。blpop/brpop会抛出异常。