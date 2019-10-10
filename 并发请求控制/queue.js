// 使用async.queue 控制并发
const async = require('async');
const concurrency = 3;

var q = async.queue((task, cb) => {
  console.log('当前并发数', q.running());
  // 执行每一个任务 
  setTimeout(() => {
    console.log('now run task is', task)
    if (task.taskId === 2) {
      // 异步任务执行失败
      return cb(new Error('fail'))
    } else {
      // 异步任务执行成功
      return cb(null, task.taskId);
    }
  }, 1000)
}, concurrency);

// 当队列所有任务都执行完时，会调用drain函数
q.drain(function() {
  console.log('all task have been processed');
  generateTask()
});

// 当并发达到规定并发的最大值时
q.saturated(() => {
  console.log('Up to the queue max concurrency', q.concurrency);
})

// 生产任务
const generateTask = function(){
  for(let i = 0; i < 10; i++){
    // 将任务添加到队列中
     q.pushAsync({taskId: i, tsakName: '任务'+i}).then( result => {
       // 任务执行成功执行
        console.log('finished current task', i, result);
     }).catch(err => {
        // 任务执行失败
        console.log('current task is error', i, err);
     })
  }
}

generateTask();