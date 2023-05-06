//jshint esversion:6
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
}

const userShema = new mongoose.Schema({
    email: {
        type: String,
        required: true
      },
    password: {
        type: String,
        required: true
      }
})

const User = mongoose.model('User', userShema);


app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
  });
  
app.get('/register', (req, res) => {
    res.render('register');
  });

app.post('/register', (req,res)=>{

  bcrypt.hash(req.body.password, saltRounds)
  .then((hash)=> {
    // Store hash in your password DB
        const newUser = new User ({
          email: req.body.username,
          password: hash
        });
        newUser.save()
            .then(res.render('secrets'))
            .catch (err=>res.send(err))
  })
  .catch(err=>{
    res.send(err);
  })
  
});

app.post('/login', (req,res)=>{

  User.findOne({email: req.body.username})
    .then(user=>{
        bcrypt.compare(req.body.password, user.password)
        .then(result => {
          if (result) {
            res.render('secrets')
          } else {
            res.status(400).send("Login failed")
          }
        })
    .catch(err=>res.send(err))
  })
  .catch (err=>res.send(err))
  
})


app.listen(3000, function(){
    console.log("Server starting on port 3000")
})
