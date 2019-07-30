[toc]

# XML To JSON

## 请求体body解析

> 接口请求时，当`body`为`xml`格式时，将`xml`格式转换为`json`对象

```
koa-xml-body  -- koa
body-parser-xml -- express
```

## 普通转换

> 可以使用`xml2js`或者`fast-xml-parser`来实现`xml`和`json`的互相转换。

### 使用fast-xml-parser

```
const parserXmlToJson = require('fast-xml-parser');
const ParserJsonToXml = require('fast-xml-parser').j2xParser;

const parserJsonToXml = new ParserJsonToXml();

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

// 测试
const jsonObj = { name: 'Super', Surname: 'Man', age: 23, son: { sonname: 'xiaoxi1', sonage: 10 } };
const xmlObj = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root>
<name>Super</name>
<Surname>Man</Surname>
<age>23</age>
<son>
    <sonname>xiaoxi1</sonname>
    <sonage>10</sonage>
  </son>
</root>`;

xmlToJson(xmlObj)
jsonToXml(jsonObj)

```

### 使用xml2js

```
const xml2js = require('xml2js');

let builder = new xml2js.Builder();
let parseString = require('xml2js').parseString;

const xmlToJson = (xmlObj) => {
  parseString(xmlObj, function(err, result) {
    return(result);
  });
};

const jsonToXml = (jsonObj) => {
  return builder.buildObject(jsonObj);
};

```