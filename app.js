//jshint esversion:6
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));

app.use(session({
  secret: 'Our little secret',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
}

const userShema = new mongoose.Schema({
    email: {
        type: String//,
        // required: true
      },
    password: {
        type: String//,
        // required: true
      }
})

userShema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userShema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
  });
  
app.get('/register', (req, res) => {
    res.render('register');
  });

app.get("/secrets", (req, res) => {
  if(req.isAuthenticated()){
    res.render('secrets');
  } else {
    res.redirect('/login');
  }
})

app.get('/logout', (req, res, next)=>{
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});
  
app.post('/register', (req,res)=>{
 
  User.register(({username: req.body.username}), req.body.password)
    .then(()=>{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    })
    .catch(err=>{
      console.log('error while user register!', err);
      res.redirect('/register');
    })
  
});

app.post('/login', (req,res)=>{
  const user = new User ({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, (err) => {
    if (err) { 
      console.log('error while user login!', err);
      res.redirect('/login');
    } else {
      passport.authenticate("local", { failureRedirect: '/login', failureMessage: true })(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
  
})


app.listen(3000, function(){
    console.log("Server starting on port 3000")
})
