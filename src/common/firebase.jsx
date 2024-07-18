import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyCiiT9wtJdhxuLFBvi87YnuvhleEYvkDbM",
  authDomain: "technimemo.firebaseapp.com",
  projectId: "technimemo",
  storageBucket: "technimemo.appspot.com",
  messagingSenderId: "794324790389",
  appId: "1:794324790389:web:346121b1a6728d4c811c3c",
};

const app = initializeApp(firebaseConfig);

//google auth
//provider setup
const provider = new GoogleAuthProvider();
//auth flow setup
const auth = getAuth();

export const authWithGoogle = async () => {
  let user = null;
  await signInWithPopup(auth, provider)
    .then((result) => {
      user = result.user;
    })
    .catch((err) => {
      console.log(err);
    });

  return user;
};
