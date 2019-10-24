const redisConfig = {
    host: '127.0.0.1',
    port: '6379',
    passwword: 'xiaoxi',
    db: 11, // 连接redis的库
    keyPrefix: 'ioredis' // 设置redis 的key的前缀
}

module.exports = {
    redisConfig
}

const Redis = require('ioredis');
const { redisConfig } = require('./redisConfig');

const redis = new Redis(redisConfig);

redis.on('connect', () => {
    console.log('----- REDIS CONNECT SUCCESS -----');
})

redis.on('error', (error) => {
    console.log('----- REDIS CONNECT ERROR -----');
})

redis.on('reconnecting', () => {
    console.log('----- REDIS reconnecting -----');
})

redis.on('ready', () => {
    console.log('----- REDIS READY -----');
})

redis.on('end', () => {
    console.log('----- REDIS END -----');
})

module.exports = redis;