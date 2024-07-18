import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import User from "./Models/User.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import admin from "firebase-admin";
import serviceAccountKey from "./technimemo-firebase-adminsdk-mwr9l-8b9607e982.json" assert { type: "json" };
import { getAuth } from "firebase-admin/auth";
import aws from "aws-sdk";
import Blog from "./Models/Blog.js";
// Helper function to get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Specify the path to the .env file in the parent directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());
let PORT = 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

let emailRegex = /^\w+([\-]?\w+)*@\w+([\--]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex email for password

app.use(express.json());
app.use(cors());
mongoose.connect(process.env.DB_LOCATION, {
  autoIndex: true,
});

// s3 bucket setup
const s3 = new aws.S3({
  region: "ap-south-1",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const generateUploadURL = async () => {
  const date = new Date();
  const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

  return await s3.getSignedUrlPromise("putObject", {
    Bucket: "technimemo",
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg",
  });
};

const formDatatoSend = (user) => {
  const access_token = jwt.sign(
    { id: user._id },
    process.env.SECRET_ACCESS_KEY
  );
  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
  };
};

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ error: "No access token" });
  }
  jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Access token is invalid" });
    }
    req.user = user.id;
    next();
  });
};

// ANOTHER THING I WANT IN RESPONSE IS ACCESS TOKEN( DYNAMIC JWT)=>long string sent to frontend (encrypted version of database id)
//whenever a req is made to frontend we sign the access token to sever and in server we decrypt and check wether the id is valid or not
// then after we authorize that user to perform varous function in the application
const generateUsername = async (email) => {
  let username = email.split("@")[0];
  let isUsernameUnique = await User.exists({
    "personal_info.username": username,
  }).then((result) => result);
  isUsernameUnique ? (username += nanoid().substring(0, 5)) : "";
  return username;
};

//upload image route url

app.get("/get-upload-url", (req, res) => {
  generateUploadURL()
    .then((url) => {
      res.status(200).json({ uploadURL: url });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

app.post("/signup", (req, res) => {
  let { fullname, email, password } = req.body;
  // validating the data from frontend
  if (fullname.length < 3) {
    return res
      .status(403)
      .json({ error: "Fullname must be at least 3 letters long" });
  }
  if (!email.length) {
    return res.status(403).json({ error: "Enter Email" });
  }
  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: "Email is invalid" });
  }
  if (!passwordRegex.test(password)) {
    return res.status(403).json({
      error:
        "Password should be 6 to 20 character long with atleast 1 numeric , 1 lowercase, 1 uppercase",
    });
  }

  bcrypt.hash(password, 10, async (err, hashed_password) => {
    console.log(hashed_password);
    let username = await generateUsername(email);
    let user = new User({
      personal_info: { fullname, email, password: hashed_password, username },
    });
    user
      .save()
      .then((u) => {
        return res.status(200).json(formDatatoSend(u));
      })
      .catch((err) => {
        if ((err.code = 11000)) {
          return res.status(500).json({ error: "Email already exists" });
        }
        return res.status(500).json({ error: err.message });
      });
  });

  //return res.status(200).json({ status: "okay" });
});

app.post("/signin", (req, res) => {
  let { email, password } = req.body;
  User.findOne({ "personal_info.email": email })
    .then((user) => {
      if (!user) {
        return res.status(403).json({ error: "Email not found" });
      }

      console.log(user);
      if (!user.google_auth) {
        bcrypt.compare(password, user.personal_info.password, (err, result) => {
          if (err) {
            return res
              .status(403)
              .json({ error: "Error occured while login please try again" });
          }
          if (!result) {
            return res.status(403).json({ error: "Incorrect password" });
          } else {
            return res.status(200).json(formDatatoSend(user));
          }
        });
      } else {
        return res.status(403).json({
          error: "Account was created using login. Try logging in with google",
        });
      }
      // return res.status(200).json({ status: "got user document" });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
});

app.post("/google-auth", async (req, res) => {
  let { access_token } = req.body;
  getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
      let { email, name, picture } = decodedUser;
      picture = picture.replace("s96-c", "s384-c");
      let user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.fullname personal_info.username personal_info.profile_img google_auth"
        )
        .then((u) => {
          return u || null;
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });
      if (user) {
        if (!user.google_auth) {
          return res.status(403).json({
            error:
              "This email was signed up without google.Please log in with password to access the account",
          });
        }
      } else {
        let username = await generateUsername(email);
        user = new User({
          personal_info: {
            fullname: name,
            email,
            profile_img: picture,
            username,
          },
          google_auth: true,
        });
        await user
          .save()
          .then((u) => {
            user = u;
          })
          .catch((err) => {
            return res.status(500).json({ error: err.message });
          });
      }
      return res.status(200).json(formDatatoSend(user));
    })
    .catch((err) => {
      return res.status(500).json({
        error:
          "Failed to authenticate you via google. Try with some other google account",
      });
    });
});

app.post("/create-blog", verifyJWT, (req, res) => {
  let authorId = req.user;
  //destructure data
  let { title, des, banner, tags, content, draft } = req.body;
  if (!title.length) {
    return res.status(403).json({ error: "You must provide a title" });
  }
  if (!draft) {
    if (!des.length || des.length > 500) {
      return res.status(403).json({
        error: "You must provide blog description under 500 characters",
      });
    }
    if (!banner.length) {
      return res
        .status(403)
        .json({ error: "You must provide a blog banner to publish the blog" });
    }
    if (!content.blocks.length) {
      return res.status(403).json({
        error: "You must provide some blog content to publish the blog",
      });
    }
    if (!tags.length || tags.length > 10) {
      return res.status(403).json({
        error: "You must provide some tags to publish the blog , max tags:10",
      });
    }
  }

  tags = tags.map((tag) => tag.toLowerCase());
  let blog_id =
    title
      .replace(/[^a-zA-Z0-9]/g, " ")
      .replace(/\s+/g, "-")
      .trim() + nanoid();
  //console.log(blogId);
  let blog = new Blog({
    title,
    des,
    banner,
    content,
    tags,
    author: authorId,
    blog_id,
    draft: Boolean(draft),
  });

  blog
    .save()
    .then((blog) => {
      let incrementVal = draft ? 0 : 1;

      User.findOneAndUpdate(
        { _id: authorId },
        {
          $inc: { "account_info.total_posts": incrementVal },
          $push: { blogs: blog._id },
        }
      )
        .then((user) => {
          //console.log("working??");
          return res.status(200).json({ id: blog.blog_id });
        })
        .catch((err) => {
          return res.status(500).json({
            error: "Failed to update the total_post and adding blog id",
          });
        });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
  //return res.json({ status: "done" });
});

app.listen(PORT, () => {
  console.log("listening at -> " + PORT);
});
