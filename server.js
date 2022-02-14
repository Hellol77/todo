const express = require("express");
const app = express();

const http = require('http').createServer(app); //socket.io
const { Server } = require("socket.io");
const io = new Server(http);

app.use(express.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
var db;
app.set("view engine", "ejs");
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.use("/public", express.static("public"));
require("dotenv").config();
MongoClient.connect(process.env.DB_URL, function (에러, client) {
  if (에러) return console(에러);
  db = client.db("todo");

  app.listen(process.env.PORT, function () {
    console.log("listening on 8080");
  });
  app.get("/", function (요청, 응답) {
    // 응답.sendFile(__dirname + "/views/index.ejs");
    응답.render("index.ejs");
  });
  app.get("/write", function (요청, 응답) {
    // 응답.sendFile(__dirname + "/views/write.ejs");
    응답.render("write.ejs");
  });
});

app.get("/list", function (요청, 응답) {
  db.collection("post")
    .find()
    .toArray(function (에러, 결과) {
      console.log(결과);
      응답.render("list.ejs", { posts: 결과 });
    });
});

app.get("/detail/:id", function (요청, 응답) {
  db.collection("post").findOne(
    { _id: parseInt(요청.params.id) },
    function (에러, 결과) {
      console.log(결과);
      응답.render("detail.ejs", { data: 결과 });
    }
  );
});

app.get("/edit/:id", function (요청, 응답) {
  db.collection("post").findOne(
    { _id: parseInt(요청.params.id) },
    function (에러, 결과) {
      응답.render("edit.ejs", { post: 결과 });
    }
  );
});

app.put("/edit", function (요청, 응답) {
  db.collection("post").updateOne(
    { _id: parseInt(요청.body.id) },
    { $set: { 할일: 요청.body.title, 날짜: 요청.body.date } },
    function (에러, 결과) {
      console.log("수정완료");
      응답.redirect("/list");
    }
  );
});

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/login", function (요청, 응답) {
  응답.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (요청, 응답) {
    응답.redirect("/");
  }
);

app.get("/mypage", 로그인확인, function (요청, 응답) {
  console.log(요청.user);
  응답.render("mypage.ejs", { 사용자: 요청.user });
});

function 로그인확인(요청, 응답, next) {
  if (요청.user) {
    next(); //통과
  } else {
    응답.send("로그인하세요");
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (입력한아이디, 입력한비번, done) {
      //console.log(입력한아이디, 입력한비번);
      db.collection("login").findOne(
        { id: 입력한아이디 },
        function (에러, 결과) {
          if (에러) return done(에러);

          if (!결과)
            return done(null, false, { message: "존재하지않는 아이디요" });
          if (입력한비번 == 결과.pw) {
            return done(null, 결과);
          } else {
            return done(null, false, { message: "비번틀렸어요" });
          }
        }
      );
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (아이디, done) {
  //세션이 있는지 찾는, 로그인한 유저의 세션아이디를 바탕으로 개인정보를 db에서 찾는 역활
  db.collection("login").findOne({ id: 아이디 }, function (에러, 결과) {
    done(null, 결과);
  });
});
app.post("/add", function (요청, 응답) {
  응답.render("write.ejs");
  db.collection("counter").findOne(
    { name: "게시물갯수" },
    function (에러, 결과) {
      console.log(결과.totalPost);
      var 총게시물갯수 = 결과.totalPost;
      var 저장할거 = {
        _id: 총게시물갯수 + 1,
        작성자: 요청.user._id,
        할일: 요청.body.title,
        날짜: 요청.body.date,
      };
      db.collection("post").insertOne(저장할거, function (에러, 결과) {
        console.log("저장완료");
        console.log(결과);
        //totalPost 항목 1 증가시키기
        db.collection("counter").updateOne(
          { name: "게시물갯수" },
          { $inc: { totalPost: 1 } },
          function (에러, 결과) {
            if (에러) {
              return console.log(에러);
            }
          }
        );
      });
    }
  );
});

app.post("/register", function (요청, 응답) {
  db.collection("login").insertOne(
    { id: 요청.body.id, pw: 요청.body.pw },
    function (에러, 결과) {
      응답.redirect("/");
    }
  );
});

app.get("/search", (요청, 응답) => {
  //요청.query에 정보가 담겨있다.
  var 검색조건 = [
    {
      $search: {
        index: "titleSearch",
        text: {
          query: 요청.query.value,
          path: "할일", // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
    { $sort: { _id: 1 } }, //오름차순으로 정렬
    { $limit: 10 },
  ];

  db.collection("post")
    .aggregate(검색조건)
    .toArray((에러, 결과) => {
      //결과 에 찾은 게시물을 보여준다.
      응답.render("search.ejs", { posts: 결과 });
    });
});

app.delete("/delete", function (요청, 응답) {
  요청.body._id = parseInt(요청.body._id);
  var 삭제할데이터 = { _id: 요청.body._id, 작성자: 요청.user._id };
  db.collection("post").deleteOne(삭제할데이터, function (에러, 결과) {
    console.log("삭제완료");
    if (에러) {
      console.log(결과);
    }
    응답.status(200).send({ message: "성공했습니다." });
  });
});

app.use("/shop", require("./routes/shop.js"));
app.use("/board/sup", require("./routes/board.js"));

let multer = require("multer");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/image");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
  filefilter: function (req, file, cb) {},
});
var upload = multer({ storage: storage });

app.get("/upload", function (요청, 응답) {
  응답.render("upload.ejs");
});

app.post("/upload", upload.single("프로필"), function (요청, 응답) {
  응답.send("완료");
});

app.get("/image/:imageName", function (요청, 응답) {
  응답.sendFile(__dirname + "/public/image/" + 요청.params.imageName);
});

const { ObjectId } = require("mongodb"); //오브젝트아이디 만들기 위해서

app.post("/chatroom", 로그인확인, function (요청, 응답) {
  var 저장할거 = {
    title: "무슨채팅방",
    member: [ObjectId(요청.body.당한사람id), 요청.user._id],
    date: new Date(),
  };

  db.collection("chatroom")
    .insertOne(저장할거)
    .then((결과) => {
      //콜백함수 insert가 성공했을시 실행되는
      응답.send("성공");
    });
});

app.get("/chat", 로그인확인, function (요청, 응답) {
  db.collection("chatroom")
    .find({ member: 요청.user._id })
    .toArray()
    .then((결과) => {
      응답.render("chat.ejs", { data: 결과 });
    }); //array에서 하나 찾기 가능
});

app.post("/message", 로그인확인, (요청, 응답) => {
  var 저장할거 = {
    parent: ObjectId(요청.body.parent),
    content: 요청.body.content,
    userid: 요청.user._id,
    date: new Date(),
  };

  db.collection("message")
    .insertOne(저장할거)
    .then(() => {
      console.log("저장성공");
    });
});

app.get("/message/:parentid", 로그인확인, function (요청, 응답) {
  응답.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  db.collection("message")
    .find({ parent: ObjectId(요청.params.parentid) })
    .toArray() //모든 메세지 찾기
    .then((결과) => {
      console.log(결과);
      응답.write("event: test\n");
      응답.write("data:" + JSON.stringify(결과) + "\n\n"); //array라서 문자로 바꾼다음 전송해야한다.
    });
  const 찾을문서 = [
    { $match: { "fullDocument.parent": ObjectId(요청.params.parentid) } },
  ]; //무조건 fullDocument붙이기

  const changeStream = db.collection("message").watch(찾을문서);

  changeStream.on("change", (result) => {
    응답.write("event:test\n");
    응답.write("data:" + JSON.stringify([result.fullDocument]) + "\n\n");
  });
});
