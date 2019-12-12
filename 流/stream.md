[toc]

# 文件流采坑

## 使用文件流的方式实现文件下载

* 设置响应头

> 不同类型的文件响应头不一样，该处以二进制流举例

```
res.set('Content-Type', 'application/octet-stream'); // 设置响应头头为二进制流
res.set("Content-Disposition", "attachment; filename=" + name); //告诉浏览器是附件，并设置附件名称
// koa ctx.set('Content-Type','application/octet-stream')
```

* 使用pipe方法将流数据写入res中

> res是可写流，通过pipe方法将可读流（可读流就是文件的二进制内容）写入到可写流res中

1. 读取本地服务器文件
```
fs.createReadStream('public/1.jpg').pipe(res)
// koa ctx.body = fs.createReadStream('public/1.jpg')
```

2. 读取其它服务器地址文件
```
var request = require('superagent');
request('https://cdn.lijinke.cn/nande.mp3').pipe(res)
// koa ctx.body = request('https://cdn.lijinke.cn/nande.mp3')
```

> 如果可以,推荐前端通过`a`标签`download`属性实现下载，不需要后端服务，此方法最能用就用，该方法能否使用可能会根据文件内容及浏览器原因有关
```
<a href="https://cdn.lijinke.cn/nande.mp3" download>下载</a>  
```

## 可读流 -- 读数据 

> `fs.createReadStream(path, opts)`读取一个相同的大文件时， highWaterMark 值的大小与读取速度的关系：highWaterMark值越大，读取速度越快。
```
    opts:
    {
    	flags: 'r',
    	encoding: null,
    	fd: null,
    	mode: 0666,
    	highWaterMark: 64 * 1024
    }
```
```
var fs = require("fs");
var data = '';

// 创建可读流
var readerStream = fs.createReadStream('input.txt');

// 设置编码为 utf8。
// readerStream.setEncoding('UTF8');

// 处理流事件 --> data, end, and error
readerStream.on('data', function(chunk) {
   data += chunk;
});

readerStream.on('end',function(){
   console.log(data);
});

readerStream.on('error', function(err){
   console.log(err.stack);
});

console.log("程序执行完毕");
```

采坑：
```
readerStream.on('data', function(chunk) {
   data += chunk;
});
```

> chunk 的类型和setEncoding有关系，chunk默认是buffer类型，若setEncoding('UTF8')，将编码设置为utf8格式，则chunk类型会变为string类型。

### 读文本文件

> 读文本文件时，需要将编码格式设置为`UTF8`格式，
readerStream.setEncoding('UTF8');

### 读图片、音频等媒体文件获取二进制流数据

> 读媒体文件时，不设置编码格式，默认获取chunk为buffer对象。<br>
同时不能使用data += chunk进行拼接，'+='是字符串拼接，会把buffer变成字符串，导致生成的二进制流数据不对，拼接时使用Buffer.concat进行拼接。<br>
创建个数组，把每次收到的buffer对象chunk push
进去，在end时使用Buffer.concat进行拼接得到最终的buffer。

```
var fs = require("fs");

// 创建可读流
var readerStream = fs.createReadStream('1.jpg');

var d = [];

// 此处不设置编码
// readerStream.setEncoding(null);

// 处理流事件 --> data, end, and error
readerStream.on('data', function(chunk) {
    d.push(chunk);
});

readerStream.on('end', function() {

    //拼接buffer对象，d为最终的二进制流数据
    d = Buffer.concat(d);
    console.log(d.length)
});

readerStream.on('error', function(err) {
    console.log(err.stack);
});

console.log("程序执行完毕");
```

## 可写流 -- 写入数据

```
var fs = require("fs");
var data = '菜鸟教程官网地址：www.runoob.com';

// 创建一个可以写入的流，写入到文件 output.txt 中
var writerStream = fs.createWriteStream('output.txt');

// 使用 utf8 编码写入数据
writerStream.write(data,'UTF8');

// 标记文件末尾
writerStream.end();

// 处理流事件 --> data, end, and error
writerStream.on('finish', function() {
    console.log("写入完成。");
});

writerStream.on('error', function(err){
   console.log(err.stack);
});

console.log("程序执行完毕");
```

## 读一个文件数据写入到另一个文件

### pipe 管道方式 -- 优先使用

```
fs.createReadStream(filename).pipe(fs.createWriteStream(filename))
```

### readstream读数据，writestream写数据

```
var fs = require("fs");
// 创建可读流
var readerStream = fs.createReadStream('1.txt');

var data = '';

// 设置编码为 utf8。
readerStream.setEncoding(null);

// 处理流事件 --> data, end, and error
readerStream.on('data', function(chunk) {
    data += chunk;
});

readerStream.on('end', function() {

    var writerStream = fs.createWriteStream('2.txt');

    // 使用 utf8 编码写入数据
    writerStream.write(d, 'UTF8');

    // 标记文件末尾
    writerStream.end();

    // 处理流事件 --> data, end, and error
    writerStream.on('finish', function() {
        console.log("写入完成。");
    });

});

readerStream.on('error', function(err) {
    console.log(err.stack);
});

```
### 小文件可用readFile读，writestream写或者writeFile写

```
fs.readFile('1.jpg', function(err, data) {
    if (err) {
        return console.error(err);
    }
    console.log(data.length)
    var writerStream = fs.createWriteStream('4.jpg');

    // 使用 utf8 编码写入数据
    writerStream.write(data);

    // 标记文件末尾
    writerStream.end();

    // 处理流事件 --> data, end, and error
    writerStream.on('finish', function() {
        console.log("写入完成。");
    });
    // console.log("异步读取: " + data.toString());
});
```

## 获取文件二进制流数据

### 大文件 

> 使用fs.createReadStream
### 小文件

> 使用fs.createReadStream 或者fs.readFile均可

## fs.readFile和fs.writeFile

也可使用fs.readFile和fs.writeFile实现文件读写

### readFile 读文件

```
fs.readFile('target.txt',(err,data)=>{
    if(err){
        throw err;
    }
    console.log(data.toString());
});
```
>  data 是 Buffer 对象,若为文本文件需要用toString()将其转为字符串，若为媒体文件，则data就是文件的二进制流数据。

### writeFile 写文件

```
const fs = require('fs');
var data = 'hello world''
fs.writeFile('target.txt',data,(err)=>{
    if(err){
        throw err;
    }
    console.log('File saved!');
});

```

# 正确拼接Buffer

> 用一个数组来存储接收到的所有Buffer片段，并记录下所有Buffer片段的总长度，然后调用Buffer.concat()方法生成一个合并的Buffer对象。 Buffer.concat() 实现了从小
Buffer对象大Buffer对象的复制过程。
Buffer.concat() 方法内部使用Buffer.copy()方法实现缓冲区的拷贝。

```
let data = [];
var size = 0;
rs.on('data',function(chunk){
  data.push(chunk);
  size += chunk.length;
})

rs.on('end',function(){
  let buf = Buffer.concat(data, size);
  console.log(buf.toString('utf8'));
})
```

# 按行读取文件内容

```
const readline = require('readline');
const fs = require('fs');
let input = fs.createReadStream('./XSGL_SALES_CODE_SDS.20191126.000000.0000.dat', {encoding: 'binary'})
const rl = readline.createInterface({
  input: input
  });
  rl.on('line', (line) => {
    // console.log(`Line from file: ${line}`);
      let buf = Buffer.from(line, 'binary')
        // console.log(buf.toString('utf8'))
	  console.log(buf.slice(95, 110).toString())
	    console.log(buf.slice(943, 946).toString());
	    });
	    rl.on('close', (line) => {
	      console.log("读取完毕！");
	      });
	      ```

	      > 默认读取的line为字符串类型。若需要将字符串转换为buffer类型, 尽量使用二进制编码，防止因文件编码导致结果不对，其中fs.createReadStream() 和Buffer.from() 中的编码要一致，最好均为'binary'。
