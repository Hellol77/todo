var router = require("express").Router();

router.get("/sports", function (요청, 응답) {
  응답.send("스포츠.");
});

router.get("/game", function (요청, 응답) {
  응답.send("게임.");
});

module.exports = router;
