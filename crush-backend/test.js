import bcrypt from "bcrypt";

const hash = "$2b$10$TVMTZq9VajzIY2zMC9ulh.wYjxBL3JoZH0HIbb.Ug7XtdYegKqLua"; // copy from DB
const password = "123"; // the one you used at signup

const isMatch = await bcrypt.compare(password, hash);
console.log("Match:", isMatch);
