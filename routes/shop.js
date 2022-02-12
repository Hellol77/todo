var router = require("express").Router();
function 로그인확인(요청, 응답, next) {
  if (요청.user) {
    next(); //통과
  } else {
    응답.send("로그인하세요");
  }
}
router.use('/shirts',로그인확인);

router.get("/shirts",  function (요청, 응답) {
  응답.send("셔츠 파는 페이지입니다.");
});

router.get("/pants",  function (요청, 응답) {
  응답.send("바지 파는 페이지입니다.");
});

module.exports = router;
