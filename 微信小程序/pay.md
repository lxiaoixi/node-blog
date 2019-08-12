[toc]

# 小程序支付

> 整个支付流程主要涉及小程序客户端、用户服务端和微信服务端。我的后端主要使用node来实现。

## 支付前准备

* 申请企业级小程序账户，获取小程序`appid`和`appsecret`
* 申请微信商户平台账户，开通微信支付, 获取商户的`mchid`和`mchKey`

## 支付流程

> 支付时，必须获取用户的openid，用户的openid可在用户授权登录操作中获取，可查看小程序的授权登录。

### 支付流程

> 一般支付就会有订单，订单可在第2/3步进行创建，在整个支付过程中，更新订单的状态(如：create、prepay、pay、fail)。

1. 小程序端向Node的服务端发起支付请求
2. Node服务端收到请求后，获取请求参数，生成统一下单参数(签名)，向微信服务端发送统一下单请求
3. 微信服务端收到统一下单请求，对该情求进行处理，下单成功后，向Node服务端返回预支付订单信息。
4. Node 服务端收到响应后，获取预支付唯一标识prepay_id，生成支付参数(再次签名)，将支付参数返给小程序端
5. 小程序端收到支付参数后，调用wx.requestPayment，向微信服务端发起真正的支付请求。
6. 微信服务端向小程序返回支付结果，小程序端显示结果，根据返回的支付结果，再进行其它业务逻辑处理。
7. 同时微信服务端会向Node服务端推送支付结果，Node服务端可根据支付结果更新该订单的状态。

### 支付流程示意图：

```
sequenceDiagram
participant A as 小程序端
participant B as Node服务端
participant C as 微信服务端


A->>B: 支付请求(预支付)
note over B: 生成统一下单参数(签名)
B->>C: 调用统一下单API
C->>B: 返回预支付订单信息
note over B: 获取prepay_id，生成支付参数(再次签名)
B->>A: 返回支付参数
A->>C: 调用wx.requestPayment，发起支付
C->>A: 返回支付结果
note over A: 显示支付结果，同时进行其它业务逻辑处理。
C->>B: 推送支付结果，更新订单状态
```

## 支付主要流程代码

### 小程序端

> 主要分为3步：<br>
1.请求支付，将订单信息传给后端<br> 2.获取后端返回的支付参数，调用微信支付API<br> 3.支付成功或失败的逻辑处理(可没有，按自己的业务逻辑) 

```
// 统一下单
dispatch({
  type: 'book/buyBook',
  payload: {
    bookId: book.id,
    title: book.title
    fee: fee
  },
  callback: res => {
    // 下单成功，获取返回的支付参数，使用wx.requestPayment调用微信支付
    const payargs = res.data
    Taro.requestPayment({
      timeStamp: payargs.timeStamp,
      nonceStr: payargs.nonceStr,
      package: payargs.package,
      signType: payargs.signType,
      paySign: payargs.paySign,
      success:function(res){
        // 支付成功，在此处进行支付成功后的业务处理
       
      },
      fail:function(res){
        // 支付失败，此处进行支付失败的处理
        Taro.showToast({
          title: `交易失败`,
          icon: 'none',
          mask: true
        })
      }
   })
  }
});
```
> 因为使用的是dva，所以代码中使用dispatch进行分发来执行后端请求，小程序可以使用wx.request。因为使用Taro框架，所以使用Taro.requestPayment，小程序使用wx.requestPayment。

Taro.requestPayment各支付参数说明见：
https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=7_7&index=5

### Node服务端

> 主要分为3步：<br>
1.生成统一下单参数<br> 2.调用微信统一下单API<br> 3.获取prepay_id，生成支付参数，返给小程序端<br>
4.接受微信服务端的支付结果消息推送(可没有，根据自己业务选择)

#### 服务端准备

##### xml转换

> 因为微信支付相关的接口都是xml格式的，所以我们需要对其进行转换。在Node中我们使用koa-xml-body和fast-xml-parser。

* koa-xml-body 解析接口请求的body为json格式。
* fast-xml-parse 普通xml转换。

```
const parserXmlToJson = require('fast-xml-parser');
const ParserJsonToXml = require('fast-xml-parser').j2xParser;

const xmlToJson = (xmlObj) => {
  return parserXmlToJson.parse(xmlObj);
};

const jsonToXml = (jsonObj, isHeader = false) => {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  if (isHeader) {
    return xmlHeader + parserJsonToXml.parse(jsonObj);
  }
  return parserJsonToXml.parse(jsonObj);
};
```

##### 随机字符串、时间戳、签名等方法生成

> 统一下单参数和获取支付参数，都需要nonceStr和timeStamp参数，及都需要签名，所以我们提前准备好。


```
// 随机字符串，不长于32位。推荐随机数生成算法
const createNonceStr = function() {
  return Math.random().toString(36).substr(2, 15);
};

// 时间戳从1970年1月1日00:00:00至今的秒数，即当前的时间
const createTimestamp = function() {
  return parseInt(new Date().getTime() / 1000) + '';
};

// 商户订单号，32位字符串，时间戳+18位随机字符, generateCode方法自己实现，我使用的是uuid
const createTradeNo = function() {
  return moment().format('YYYYMMDDHHMMSS') + generateCode(18);
};

/**
 * 生成签名
 * @param {* 商户密钥，必选} mchKey
 */
const getSign = function(obj) {
  const stringA = Object.keys(obj)
    .filter(key => key !== 'sign' && obj[key])
    .sort()
    .map(key => key + '=' + obj[key])
    .join('&');
  const stringSignTemp = `${stringA}&key=${wechat.mchKey}`;
  const sign = md5(stringSignTemp).toUpperCase();
  return sign;
};
```

> 签名生成的规则：<br>除了sign以外，其他所有的参数，按参数名进行排序，使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串，最后拼接上&key=${wechat.mchKey}，再对最后拼接好的字符串进行MD5加密，再转换为大写，即可得到最后的签名。

##### 统一下单和支付参数

* 我们看下统一下单和支付参数的必选参数都有哪些。

统一下单必选参数：

```
{
    appid: wechat.appid, // appid
    mch_id: wechat.mchid, // 商户id
    trade_type: params.trade_type || 'JSAPI', //交易类型
    spbill_create_ip: wechat.ip, // 支付提交用户端ip
    notify_url: wechat.notify_url, // 异步接收微信支付结果通知
    nonce_str: createNonceStr(),  // 随机字符串，不长于32位
    out_trade_no: createTradeNo(), // 商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*且在同一个商户号下唯一。
    openid, //用户openid
    body, // 商品描述
    total_fee, // 商品总价
    sign  // 签名
}
```

支付参数：

```
{
    appId: wechat.appid,
    timeStamp: createTimestamp(),
    nonceStr: params.nonce_str || createNonceStr(),
    package: `prepay_id=${params.prepay_id}`,   // 统一下单接口返回的 prepay_id 参数值，提交格式如：prepay_id=*
    signType: 'MD5',
    paySign // 签名
}
```
* 封装获取统一下单参数和支付参数方法
```
/**
 * 获取统一下单参数
 * @param {* 用户openid，必选} openid
 * @param {* 商品描述，必选} body
 * @param {* 商品总价，单位为分，必选} total_fee
 * @param {* 商品详情，可选} detail
 * @param {* 交易类型，默认为JSAPI，可选} trade_type
 */
const getPrePayParams = (params) => {
  const obj = {
    appid: wechat.appid, // appid
    mch_id: wechat.mchid, // 商户id
    trade_type: params.trade_type || 'JSAPI',
    spbill_create_ip: wechat.ip, // 支付提交用户端ip
    notify_url: wechat.notify_url, // 异步接收微信支付结果通知
    nonce_str: createNonceStr(),
    out_trade_no: createTradeNo(), // 内部订单号
    ...params
  };

  const sign = getSign(obj);
  obj.sign = sign;
  return obj;
};

/**
 * 获取支付参数，必须为以下字段，不能多也不能少
 * @param {* 预支付交易会话标识, 必选} prepay_id
 * @param {* 随机字符串，不长于32位, 可选} nonce_str
 */
const getPayParamsByPrepay = (params) => {
  const obj = {
    appId: wechat.appid,
    timeStamp: createTimestamp(),
    nonceStr: params.nonce_str || createNonceStr(),
    package: `prepay_id=${params.prepay_id}`,
    signType: 'MD5'
  };
  const sign = getSign(obj);
  obj.paySign = sign;
  return obj;
};

```

**注意：必选参数一个都不能少**

#### 支付流程

1. 获取统一下单参数

```
// params 为传过来的参数，见getPrePayParams说明
let preParams = getPrePayParams(params);

```

2. 调用统一下单API

```
let payParams = jsonToXml(params);
payParams = `<xml>${payParams}</xml>`;
let { res } = await postRequest(wechat.orderUrl, payParams, {}, 'xml');
res = xmlToJson(res.text).xml;
logger.info(ctx.log(), 'getOrder result is', res);
// 可在此处生成订单，将订单相关信息全部入库

```

3.获取预支付信息res(prepay_id)，生成支付参数，返给小程序端

```
// 获取支付参数
const payParams = getPayParamsByPrepay(res)
// 返给小程序端
return ctx.body = { code: '000000', data: payParams, msg: 'success' };
```

4.接受微信服务端的支付结果消息推送(可没有，根据自己业务选择)

在此处可更新订单的状态，支付成功或失败。该地址为在统一下单中设置的notify_url。

#### 配置说明

整个后端支付流程中，涉及到所有微信相关的配置，我们统一放到配置文件中，大致如下：

```
wechat: {
    appid: '12345678',  
    secret: '12345678',
    openIdUrl: 'https://api.weixin.qq.com/sns/jscode2session', 
    mchid: '12345678',  
    mchKey: '12345678',
    ip: '127.0.0.1',
    notify_url: 'https://127.0.0.1:5021/api/journal/payresult',
    orderUrl: 'https://api.mch.weixin.qq.com/pay/unifiedorder'
}
```

* appid: 小程序id
* secret: 小程序密钥
* mchid:  商户id
* mchKey: 商户密钥
* openIdUrl: 获取用户openid的微信url
* ip: 调用微信支付API的机器IP
* notify_url: 异步接收微信支付结果通知的回调地址
* orderUrl: 微信服务端统一下单API地址















