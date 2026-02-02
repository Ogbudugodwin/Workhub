// src/auth/Register.jsx
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      role: "user",
      createdAt: new Date(),
    });
  };

  return (
    <form onSubmit={submit}>
      <input onChange={e => setEmail(e.target.value)} />
      <input onChange={e => setPassword(e.target.value)} type="password" />
      <button>Sign Up</button>
    </form>
  );
}
