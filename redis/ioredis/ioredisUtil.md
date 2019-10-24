# ioredis 实例

const redis = require('./ioredisHelper');

## 基础数据类型 string、hash、list、set、zset

### 字符串 string 

```
const setString = async(key, value) => {
    await redis.set(key, value);
}

const getString = async(key) => {
    let value = await redis.get(key);
    return value;
}

// 设置过期时间 1.设置key 2.设置过期时间
const setStringExpire = async(key, value, expireType, expireTime) => {
    let multi = redis.multi(); //使用事务
    multi.set(key, value); // 此处根据具体场景变换 数据类型
    multi.expire(key, expireTime); //此处根据具体场景变化过期时间类型 秒、毫秒等
    await multi.exec();
}
```
> string类型 可以使用如下设置过期时间：

```
redis.set('key', 100, 'ex', 10)

'ex' : s
'px' : ms
'nx' : only set the key if it does not already exist
'xx' : only det the key if it already exist

/**
 * 添加key同时设置过期时间
 * @param {* redis键} key
 * @param {* value值} value
 * @param {* 过期时间类型：ex(秒)/px(毫秒)} expireType
 * @param {* 时长} expireValue
 */
const setStringExpire = async(key, value, expireType, expireValue) => {
  await redis.set(key, value, expireType, expireValue);
};
```

### 对象 Hash 

```
/**
 *
 * @param {* 键} key
 * @param {* 值} value
 * @param {* 过期时长/s} expireValue
 */
const Hmset = async(key, value, expireValue) => {
  const multi = redis.multi(); //使用事务
  multi.hmset(key, value);
  if (expireValue) {
    multi.expire(key, expireValue);
  }
  await multi.exec();
};

const Hgetall = async(key) => {
    let value = await redis.hgetall(key);
    return value;
}

const Hset= async(key, field, value) => {
    await redis.hset(key, field, value);
}

const Hget = async(key, field) => {
    let value = await redis.hget(key, field);
    console.log(value);
    return value;
}

const Hdel = async(key,field) => {
    await redis.hdel(key,field);
}
```

### 队列(消息队列) List 

```
// 头部添加
const Lpush = async(key, values) => {
    await redis.lpush(key, values);
}

// 尾部添加
const Rpush = async(key, values) => {
    await redis.rpush(key, values);
}

//获取列表指定范围内的元素,0第一个元素，-1最后一个元素，-2倒数第二个
const Lrange = async(key, start, end) => {
    let value = await redis.lrange(key, start, end);
    return value;
}
```

### 集合(无序不重复) Set 

```
const Sadd = async(key, values) => {
    await redis.sadd(key, values);
}

const Smembers = async(key) => {
    let values = await redis.smembers(key);
    return values;
}

const SiSmembers = async(key, value) => {
  return await redis.sismember(key, value);
};

// 集合可进行交集、差集、并集运算
// 获取指定所有集合的交集
const Sinter = async(keys) => {
    let values = await redis.sinter(keys);
    return values;
}
```
### 集合(有序不重复,分数Score排序) Zset 

```
const Zadd = async(key, values) => {
    await redis.zadd(key, values)
}

//通过索引区间返回有序集合成指定区间内的成员(可指定区间，指定分数，分数递增或递减排序)
const Zrange = async(key, start, end) => {
    let values = redis.zrange(key, start, end);
    return values;
}

// 删除key
const delKey = async(key) => {
  await redis.del(key);
};

// 获取过期时间
const ttl = async(key) => {
  await redis.ttl(key);
};

// 自增
const incrBy = async(key, value) => {
  return await redis.incrby(key, value);
};

const keyIsExit = async(key) => {
    let result = await redis.exists(key);
    console.log(result);
    return result;
}

```


## Pipelining 管道 pipeline redis.pipeline()

> send a batch of commands (e.g. > 5), you can use pipelining to queue the commands in memory and then send them to Redis all at once.

 ```
    var pipeline = redis.pipeline();     pipeline.set('foo', 'bar');
    pipeline.get('foo');
    pipeline.exec();
    // 或者 采用 链式写法
    var result = await redis.pipeline().set('foo', 'bar').get('foo').exec();
     result 是个数组，数组中每一项是每个命令的结果  [ [ null, 'OK' ], [ null, 'bar' ] ]
```

## Transaction 事务 multi

```
 let multi = redis.multi();
 multi.set('foo', 'bar');
 multi.get('foo');
 multi.exec();
 // 或者 采用 链式写法
 var results = redis.multi().set('foo', 'bar').get('foo').exec();
```

## Sentinel 哨兵机制 主从复制  a master and one or more slaves 

```
 var redis = new Redis({
     sentinels: [{ host: 'localhost', port: 26379 }, { host: 'localhost', port: 26380 }],
     name: 'mymaster'
 });
```

 * sentinels  哨兵组。
 * name 组名称。
 * role 可选，该参数值只能为slave，若指定该参数，ioredis将会连接一个slave而不是master。
 * preferredSlaves 可选，同role一起指定，是一组sentinels，ioredis将会从这组中选择一个slave连接。
 
```
 var preferredSlaves = [
     { ip: '127.0.0.1', port: '31231', prio: 1 },
     { ip: '127.0.0.1', port: '31232', prio: 2 }
 ];

 var redis = new Redis({
     sentinels: [{ host: '127.0.0.1', port: 26379 }, { host: '127.0.0.1', port: 26380 }],
     name: 'mymaster',
     role: 'slave',
     preferredSlaves: preferredSlaves
 });
```

## Cluster 集群，多结点 

```
var Redis = require('ioredis');

var cluster = new Redis.Cluster([{
  port: 6380,
  host: '127.0.0.1'
}, {
  port: 6381,
  host: '127.0.0.1'
}]);

cluster.set('foo', 'bar');
cluster.get('foo', function (err, res) {
  // res === 'bar'
});
```

## Read - write splitting 读写分离

> 典型的redis集群包含3个或更多主数据库(master),每个master又有多个从数据库(slaves),读写分离：一般为主数据库用来进行写操作，从数据库用来进行查询操作。通过设置scaleReads 参数，来决定读写方式。

scaleReads：
* master(default): 读写全为master
* all: 写master,读master或slaves
* slave: 写master,读slaves

```
    var cluster = new Redis.Cluster([/* nodes */], {
        scaleReads: 'slave'
    });

    cluster.set('foo', 'bar'); // This query will be sent to one of the masters.
    cluster.get('foo', function (err, res) {
    // This query will be sent to one of the slaves.
    })
```

## PUB / SUB 订阅发布

详见`sub-pub.md`文件。



## Test 测试代码

```
async function testSetString() {
    console.log('begin set string')
    await setString('name', 'xiaoxi')
    console.log('end set string')
}


async function testGetString() {
    console.log('begin get string')
    let value = await getString('name');
    console.log(value)
    console.log('end get string')
}

async function testHmset() {
    console.log('begin Hmset')
    await Hmset('user', { 'name': 'xiaoxi', 'age': 10 });
    console.log('end Hmset')
}

async function testHget() {
    console.log('begin Hget')
    let value = await Hget('user', 'age');
    console.log(value);
    console.log('end Hget')
}

async function testHgetall() {
    console.log('begin testHgetall')
    let value = await Hgetall('user');
    console.log(value);
    console.log('end testHgetall')
}

async function testLpush() {
    console.log('begin Lpush')
    await Lpush('books', ['js', 'java']);
    console.log('end Lpush')
}

async function testRpush() {
    console.log('begin Rpush')
    await Rpush('books', 10);
    console.log('end Rpush')
}

async function testLrange() {
    console.log('begin Lrange')
    let values = await Lrange('books', 0, -1);
    console.log(values)
    console.log('end Lrange')
}

async function testSadd() {
    console.log('begin Sadd')
    await Sadd('friend', ['小明', '小张', '小新', '小红']);
    console.log('end Sadd')
}

async function testSmembers() {
    console.log('begin Smembers')
    let values = await Smembers('friends');
    console.log(values)
    console.log('end Smembers')
}

async function testSinter() {
    console.log('begin Sinter')
    let values = await Sinter(['friends', 'friend']);
    console.log(values)
    console.log('end Sinter')
}

async function testZadd() {
    console.log('begin Zadd')
    await Zadd('language', [2, 'node', 1, 'go', 3.5, 'java']);
    console.log('end Zadd')
}

async function testZrange() {
    console.log('begin Zrange')
    const values = await Zrange('language', 0, -1);
    console.log(values);
    console.log('end Zrange')
}

async function testPipeline() {
    let multi = redis.multi();
    multi.set('foo', 'bar');
    multi.set('bar');
    let results = await multi.exec();
    //let results = await redis.multi().set('foo', 'bar').set('bar').exec();
    console.log(results);
}

testPipeline();
```