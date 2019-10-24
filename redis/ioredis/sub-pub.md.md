## redis 订阅发布模式简单测试（可解决Node多节点问题）

```
let Redis = require('ioredis');
let redisConfig = { //Redis 连接配置
    host: '127.0.0.1',
    port: '6379',
    db: 11
}

// 订阅client
var redisSub = new Redis(redisConfig);
// 发布client
var redisPub = new Redis(redisConfig);

// 监听订阅成功事件
redisSub.on('subscribe', function(channel, count) {
    console.log('subscribe ' + 'channel is： ' + channel + ' count is: ' + count);
})

// 监听取消订阅事件
redisSub.on('unsubscribe', function(channel, count) {
    console.log('unsubscribe ' + 'channel is: ' + channel + ' count is: ' + count);
})

// 每次收到消息后执行回调，message是redis发布的消息，该处可实现每次收到消息后对消息做些其他处理操作
redisSub.on("message", function(channel, message) {
    console.log(channel);
    console.log(message);
    if (channel == 'second channel') {
        // 收到某个消息后取消订阅
        redisSub.unsubscribe('second channel');
    }
})


// 订阅消息
redisSub.subscribe('first channel');
redisSub.subscribe('second channel');

//发布消息
redisPub.publish('first channel', 'I am in first channel');
redisPub.publish('second channel', 'I am in second channel');
```

> 若两个客户端订阅同一个channel，则channel中的同一条消息，这两个客户端均可以收到。

```
redisSub1.subscribe('first channel');
redisSub1.on("message", function(channel, message) {
    console.log(channel);
    console.log(message);
})
```