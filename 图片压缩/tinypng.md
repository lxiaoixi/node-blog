# 图片压缩

## 申请key 
  https://tinypng.com/developers

## 安装包

```
npm install -g gulp
npm install gulp-tinypng-compress
```

## example

```
var gulp = require('gulp');
var tinypng = require('gulp-tinypng-compress');
 
gulp.task('tinypng', function () {
    gulp.src('./images/*.{png,jpg,jpeg}')
        .pipe(tinypng({
            key: '4BTHQKmz5pLLcgXp4dCC3QvjY1tg0V8D',
            log: true,
            summarize: true,
			      sigFile: 'images/.tinypng-sigs',
        }))
        .pipe(gulp.dest('./dest'));
});
```

## 执行压缩
```
gulp tinypng
```
