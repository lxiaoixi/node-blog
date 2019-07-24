[toc]

# 使用multer上传文件
> 上传文件前端必须以表单形式`formData`提交，`action` 为 `post`，enctype为`multipart/form-data`。 
`multer`会将文件及`body`信息挂在 `ctx.req.file/ctx.req.files` 和 `ctx.req.body`下(`express`在`req.file`和`req.body`)。

## 前端formData对象使用

> 前端使用`formData`对象来上传文件，若某字段上传多个文件，则可以依次添加,如下，`bannerUrl`上传多张图片。

```
var formData = new FormData();
formData.append('title', '绅士的突围');
formData.append('desc', 'xiaoxi');
formData.append('bannerUrl', file1);
formData.append('bannerUrl', file2);
```

## 安装npm依赖

1. npm install multer(express)
2. npm install koa-multer(koa)

## 简单使用

```
var multer  = require('koa-multer')
var upload = multer({ dest: 'uploads/' })  // dest: 指定文件上传路径

// 上传单个文件，avatar 为前端传过来的文件字段
app.post('/profile', upload.single('avatar'), function (req, res, next) {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
})

// 同一个字段上传多个文件
app.post('/photos/upload', upload.array('photos', 12), function (req, res, next) {
  // req.files is array of `photos` files
  // req.body will contain the text fields, if there were any
})

// 多字段，多文件
var cpUpload = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'gallery', maxCount: 8 }])
app.post('/cool-profile', cpUpload, function (req, res, next) {
  //  req.files['avatar'][0] -> File
  //  req.files['gallery'] -> Array
  //
  // req.body will contain the text fields, if there were any
})

```


## 自定义配置multer, 自定义中间件

> 程序中，我们往往会需要自定义文件上传的路径和名称，及对上传的文件进行过滤、文件大小名称等限制，还有对文件上传的异常控制，我们就需要自定义配置multer, 实现自定义中间件。

### 配置上传文件的路径和文件名称

> 主要配置`multer`的`storage`

```
const storage = multer.diskStorage({
  destination: path.resolve(__dirname, '../../public/uploads') + '/' + new Date().getFullYear() + (new Date().getMonth() + 1) + new Date().getDate(),
  // destination: function(ctx, file, cb) {
  //   cb(null, path.resolve(__dirname, '../../public/uploads'));
  // },
  //给上传文件重命名，获取添加后缀名
  filename: function(ctx, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
```

1. `destination`: 配置文件上传的路径。注意：若是字符串会自动创建路径、若是函数则不会, 我们使用字符串自动创建路径。
2. `filename`: 配置文件名称。

### 配置文件过滤器，控制文件上传的类型

> 主要配置`multer`的`fileFilter`

```
const fileFilter = (ctx, file, cb) => {
  let ext = file.originalname.split('.');
  ext = ext[ext.length - 1];
  // 检查文件后缀是否符合规则
  if (checkFileExt(ext, true)) {
    cb(null, true);
  } else {
    // 不符合规则，拒绝文件并且直接抛出错误
    cb(null, false);
    cb(new Error('文件类型错误'));
  }
};
```

### 配置文件上传大小限制等

> 主要配置`multer`的`limits`

```
const limits = {
  fieldSize: '1MB'
}
```

### 导出multer对象

> 导出`multer`对象，在别的地方引用该对象。

```
const upload = multer({
  storage,
  fileFilter,
  limit
});
```

### 自定义上传文件中间件，及对异常进行捕获。

```
async function uploadMiddleware(ctx, next) {
  const uploadFile = upload.fields([{ name: 'coverUrl', maxCount: 1 }, { name: 'bannerUrl', maxCount: 8 }, { name: 'src', maxCount: 8 }]);

  try {
    await uploadFile(ctx, next);
    logger.info(ctx.context.log(), 'upload file is', ctx.req.files); // 上传的文件
    logger.info(ctx.context.log(), 'upload body is', ctx.req.body);  // 上传的body信息
  } catch (e) { // 对上传过程的异常进行捕获
    logger.error('uploadFile error: ', e);
    ctx.status = 500;
    return ctx.body = getError(3000);
  }
}

```

在中间件`uploadMiddleware`，我们使用`upload.fields`这个方法，对文件进行混合上传，这样整个系统都可以使用这个中间件，如果有新的上传接口，只需在`upload.fields`里添加上传接口的新字段就可以了。

### 在上传文件接口引用中间件uploadMiddleware

```
router.post('/book', uploadMiddleware, indexController.createBook);
```


### 最后对multer对象封装

> 在开发中，有可能对不同类型的文件需要上传到不同的目录，这时我们可以对`multer`对象进行封装，不同类型的使用不同的`muter`。如下：接收`destination`和`filename`参数，指定该`multer`对象的上传路径和文件名称。还可以根据自己需要指定其他参数。

```
function uploadObject(destination, filename){
  var multer  = require('koa-multer')

  const storage = multer.diskStorage({
    destination: path.resolve(__dirname, '../../public/uploads') + '/' + new Date().getFullYear() + (new Date().getMonth() + 1) + new Date().getDate(),
    // destination: function(ctx, file, cb) {
    //   cb(null, path.resolve(__dirname, '../../public/uploads'));
    // },
    //给上传文件重命名，获取添加后缀名
    filename: function(ctx, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });

  const fileFilter = (ctx, file, cb) => {
    let ext = file.originalname.split('.');
    ext = ext[ext.length - 1];
    // 检查文件后缀是否符合规则
    if (checkFileExt(ext, true)) {
      cb(null, true);
    } else {
      // 不符合规则，拒绝文件并且直接抛出错误
      cb(null, false);
      cb(new Error('文件类型错误'));
    }
  };

  const limits = {
    fieldSize: '1MB'
  }

  const upload = multer({
    storage,
    fileFilter,
    limit
  });

  return upload;
}

```

### fileFilter 中checkFileExt方法大致如下：根据实际开发自己实现

```
/**
 * @description 检查文件后缀是否满足要求
 * @param {Boolean} allow  // 描述规则是 allow 还是 deny,allow 在规则里，deny 不在规则里
 * @param {String} rule // 规则字符串
 * @param {String} ext  // 文件后缀名
 */
const checkFileExt = (ext, allow = true, rule = 'png|jpeg|bmp|svg|jpg') => {
  if (!ext) return false;
  if (allow) return rule.includes(ext);
  return !rule.includes(ext);
};
```

# 使用formidable上传文件

```
  var formidable = require('formidable');
  var form = new formidable.IncomingForm(); //创建上传表单
  form.encoding = 'utf-8'; //设置编辑
  form.uploadDir = `public/upload/`; //设置上传目录
  form.keepExtensions = true; //保留后缀
  form.maxFields = 20 * 1024 * 1024; //文件大小

  form.parse(req, function(err, fields, files) {
      if (err) {
          console.log('999999')
          console.log(err);
          doRes('900001', '解析文件错误', { list: [] }, res)
      }

      return doRes('000000', 'ok', { path:files.file.path }, res)
  });
```



