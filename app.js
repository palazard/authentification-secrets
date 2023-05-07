//jshint esversion:6
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));

app.use(session({
  secret: process.env.SESSION_SECRET,
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
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secrets: [String]
})

userShema.plugin(passportLocalMongoose);
userShema.plugin(findOrCreate);

const User = mongoose.model('User', userShema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use passport serialize and deserialize of model for session support
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.displayName });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      // console.log(profile);
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ['id', 'email']
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      // console.log(profile);
      return cb(err, user);
    });
  }
));

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['profile'] }));

app.get('/login', (req, res) => {
    res.render('login');
  });
  
app.get('/register', (req, res) => {
    res.render('register');
  });

app.get("/secrets", (req, res) => {
  if(req.isAuthenticated()){
    User.find({secrets: { $exists: true, $ne: [] } })
     .then(usersWithSecrets=> res.render('secrets', {usersWithSecrets}))
     .catch(err=>console.log('Error finding secrets:', err));
  } else {
    res.redirect('/login');
  }
})

app.get("/submit", (req, res) => {
  if(req.isAuthenticated()){
    res.render('submit');
  } else {
    res.redirect('/login');
  }
})

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
});

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

app.post('/submit', (req,res)=>{
  // const newSecret = req.body.secret;
  // console.log(req.user);
  User.findById(req.user.id)
  .then(user=>{
    user.secrets.push(req.body.secret);
    user.save()
     .then(res.redirect('/secrets'))
     .catch(err=>res.send(err))
  })
  .catch(err=>res.send(err))
});


app.listen(3000, function(){
    console.log("Server starting on port 3000")
})
